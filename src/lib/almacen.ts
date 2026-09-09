import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { extname } from "node:path";
import sharp from "sharp";
import { ENTORNO } from "./entorno";
import { anchosAGenerar, archivoVariante, prefijoVariantes } from "./imagenes";
import { registrarFallo } from "./registro";

// Almacenamiento de portadas en Wasabi (S3 compatible). El bucket es privado:
// las imagenes se sirven a traves del endpoint /uploads/[...ruta].ts, por lo
// que las URLs guardadas en la base de datos no cambian.
const PREFIJO = "portadas/";
const EXTENSIONES_PERMITIDAS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const TAMANO_MAXIMO = 5 * 1024 * 1024; // 5 MB

const TIPOS_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

// Validadas al arrancar (ver src/lib/entorno.ts). Antes se leian con `?? ""`,
// asi que unas credenciales ausentes no rompian nada al iniciar y aparecian
// mucho despues como «tu imagen no es valida» en la cara de quien administra.
const BUCKET = ENTORNO.wasabi.bucket;

// Medido: la portada mas grande del sitio se pinta a ~165 px de ancho (la
// grilla de la portada), y las demas a menos (128 px en la pagina de linea, 64
// en el panel). 600 cubre ese hueco incluso a 3x de densidad y deja margen por
// si algun dia se agrega una vista mayor. El 1200 anterior servia mas del doble
// de pixeles de los que cualquier pantalla llega a usar.
const ANCHO_MAXIMO = 600;

// Las imagenes de secciones fijas ocupan hasta ~800 px de ancho: 1600 les da
// el mismo margen de alta densidad que 1200 a las tapas.
export const ANCHO_IMAGEN_SITIO = 1600;

// Las del hero cubren la seccion completa, de borde a borde: 1920 evita que
// lleguen blandas a un monitor grande. Solo afecta a subidas nuevas.
export const ANCHO_IMAGEN_HERO = 1920;

// La version para celular del hero solo se sirve por debajo de 768 px, asi que
// nunca se pinta a mas de un ancho de telefono: uno de 390 px CSS a 3x de
// densidad pide 1170 px. 1200 lo cubre y coincide con un escalon de variante
// (src/lib/imagenes.ts), asi que no se genera un ancho suelto. Mas que eso no
// anade un pixel visible, solo peso en la conexion mas lenta del sitio.
export const ANCHO_IMAGEN_HERO_MOVIL = 1200;

// Con timeouts explicitos: sin ellos, un bucket que no responde (colgado, no
// caido) deja cada peticion de imagen esperando indefinidamente, y /uploads
// esta en la ruta caliente de todas las paginas publicas.
const cliente = new S3Client({
  region: ENTORNO.wasabi.region,
  endpoint: ENTORNO.wasabi.endpoint,
  credentials: {
    accessKeyId: ENTORNO.wasabi.accessKey,
    secretAccessKey: ENTORNO.wasabi.secretKey,
  },
  requestHandler: { connectionTimeout: 3_000, requestTimeout: 15_000 },
  maxAttempts: 3,
});

export function esPortadaValida(archivo: File): string | null {
  const ext = extname(archivo.name).toLowerCase();
  if (!EXTENSIONES_PERMITIDAS.has(ext)) {
    return "Formato no permitido. Usa JPG, PNG o WebP.";
  }
  if (archivo.size > TAMANO_MAXIMO) {
    return "La imagen supera los 5 MB.";
  }
  return null;
}

function esNombreSeguro(nombre: string): boolean {
  return !nombre.includes("/") && !nombre.includes("\\") && !nombre.includes("..");
}

/**
 * El archivo no es una imagen que sepamos procesar. Es culpa del archivo, se le
 * puede decir a quien lo subio y NO se registra: no es un incidente.
 */
export class ErrorImagenInvalida extends Error {
  constructor(causa: unknown) {
    super("La imagen no se pudo procesar", { cause: causa });
    this.name = "ErrorImagenInvalida";
  }
}

/**
 * El almacenamiento fallo: credenciales, red, permisos del bucket. NO es culpa
 * de quien subio el archivo, asi que decirle «verifica que sea un JPG valido»
 * lo manda a reexportar su foto una y otra vez mientras el problema real queda
 * invisible. Se registra siempre.
 */
export class ErrorAlmacenamiento extends Error {
  constructor(operacion: string, causa: unknown) {
    super(`Fallo el almacenamiento al ${operacion}`, { cause: causa });
    this.name = "ErrorAlmacenamiento";
  }
}

interface ImagenOptimizada {
  datos: Buffer;
  ancho: number;
  alto: number;
}

// Redimensiona y comprime la imagen conservando su formato original, para que
// la extension, el tipo MIME y la URL guardada en la base de datos no cambien.
// Devuelve tambien las medidas del resultado: `resolveWithObject` las trae del
// propio procesado, sin volver a leer el archivo.
async function optimizarImagen(
  bytes: Buffer,
  ext: string,
  ancho: number,
): Promise<ImagenOptimizada> {
  const base = sharp(bytes)
    .rotate() // respeta la orientacion EXIF de las fotos de camara
    .resize({ width: ancho, withoutEnlargement: true });

  const salida =
    ext === ".png"
      ? base.png({ compressionLevel: 9 })
      : ext === ".webp"
        ? base.webp({ quality: 82 })
        : base.jpeg({ quality: 82, progressive: true, mozjpeg: true });

  const { data, info } = await salida.toBuffer({ resolveWithObject: true });
  return { datos: data, ancho: info.width, alto: info.height };
}

/** Calidad de las variantes WebP: la misma que ya se usa para JPEG y WebP. */
const CALIDAD_VARIANTE = 82;

/** Todas las variantes son WebP, sea cual sea el formato del original. */
const TIPO_VARIANTE = "image/webp";

interface ObjetoSubible {
  /** Nombre dentro del prefijo del bucket, que es tambien el de la URL publica. */
  nombre: string;
  datos: Buffer;
  tipo: string;
}

/**
 * Genera en memoria las variantes mas angostas que el original.
 *
 * La entrada es SIEMPRE el original ya procesado por `optimizarImagen` (o el que
 * ya esta guardado en el bucket, que salio de ahi): comparte su orientacion y su
 * ancho real, que es justo el que el `srcset` declara. Por eso no hace falta
 * volver a llamar a `rotate()` — el buffer procesado ya no lleva EXIF.
 */
async function crearVariantes(
  bytes: Buffer,
  anchoOriginal: number,
  nombreArchivo: string,
): Promise<ObjetoSubible[]> {
  return Promise.all(
    anchosAGenerar(anchoOriginal).map(async (ancho) => ({
      nombre: archivoVariante(nombreArchivo, ancho),
      datos: await sharp(bytes)
        .resize({ width: ancho, withoutEnlargement: true })
        .webp({ quality: CALIDAD_VARIANTE })
        .toBuffer(),
      tipo: TIPO_VARIANTE,
    })),
  );
}

async function subirObjeto(objeto: ObjetoSubible): Promise<void> {
  await cliente.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: `${PREFIJO}${objeto.nombre}`,
      Body: objeto.datos,
      ContentType: objeto.tipo,
    }),
  );
}

async function borrarClave(nombre: string): Promise<void> {
  await cliente.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: `${PREFIJO}${nombre}` }));
}

/**
 * Sube el lote entero o no deja nada.
 *
 * POR QUE TODO O NADA
 * Una imagen y sus variantes son un solo objeto para el navegador: el `srcset`
 * se deduce del ancho guardado en la base y las nombra TODAS, sin preguntar
 * cuales llegaron a subirse. Si el original entra y una variante no, la pagina
 * no se degrada, se ROMPE — el navegador pide el archivo que le prometimos y
 * recibe un 404, justo en el ancho de pantalla mas comun. Por eso, ante
 * cualquier fallo, se deshace lo ya subido y se devuelve el error de
 * almacenamiento de siempre.
 */
async function subirLote(objetos: ObjetoSubible[]): Promise<void> {
  const resultados = await Promise.allSettled(objetos.map(subirObjeto));
  const rechazado = resultados.find((r): r is PromiseRejectedResult => r.status === "rejected");
  if (!rechazado) return;

  const subidos = objetos.filter((_, posicion) => resultados[posicion]?.status === "fulfilled");
  await Promise.all(
    subidos.map(async (objeto) => {
      // El deshacer no puede tapar el fallo original: se registra y se sigue.
      try {
        await borrarClave(objeto.nombre);
      } catch (fallo) {
        registrarFallo(`deshacer la subida de «${objeto.nombre}»`, fallo);
      }
    }),
  );

  const nombres = objetos.map((objeto) => objeto.nombre).join(", ");
  registrarFallo(`guardar «${nombres}» en el bucket`, rechazado.reason);
  throw new ErrorAlmacenamiento("guardar la imagen", rechazado.reason);
}

/**
 * Genera y sube las variantes de una imagen que YA vive en el bucket.
 *
 * La usa scripts/generar-variantes.mts para las filas anteriores a que esto
 * existiera. Es idempotente: volver a correrla sobrescribe cada variante con una
 * identica. Devuelve los anchos generados.
 *
 * SIN deshacer, a diferencia de `guardarImagen`: aqui el original YA esta en el
 * bucket y la fila puede traer su ancho cargado desde antes (Libro, ImagenSitio,
 * Linea, PaginaInstitucional), asi que la pagina ya promete las variantes.
 * Deshacer ante un fallo borraria las variantes BUENAS de una corrida anterior
 * y dejaria esa promesa sin archivos: peor que el fallo que intentaria tapar.
 * Lo que falle se informa y se reintenta corriendo el script de nuevo.
 */
export async function generarVariantes(
  bytes: Buffer,
  anchoOriginal: number,
  nombreArchivo: string,
): Promise<number[]> {
  const anchos = anchosAGenerar(anchoOriginal);
  const variantes = await crearVariantes(bytes, anchoOriginal, nombreArchivo);
  await Promise.all(variantes.map(subirObjeto));
  return anchos;
}

/** Convierte un texto libre en un segmento de nombre de archivo seguro. */
function aRanura(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

export interface ImagenGuardada {
  url: string;
  ancho: number;
  alto: number;
}

/**
 * Sube una imagen optimizada al bucket y devuelve su URL publica (/uploads/...)
 * junto con las medidas reales del archivo subido. Todas las imagenes comparten
 * el prefijo de portadas para que el endpoint que las sirve siga siendo uno solo.
 */
export async function guardarImagen(
  archivo: File,
  nombreBase: string,
  opciones: { anchoMaximo?: number } = {},
): Promise<ImagenGuardada> {
  const ext = extname(archivo.name).toLowerCase();
  const nombre = `${aRanura(nombreBase) || "imagen"}-${Date.now()}${ext}`;

  // Las dos etapas se distinguen a proposito: procesar es culpa del archivo,
  // subir es culpa nuestra. Antes compartian un unico catch y cualquier fallo
  // del bucket se le mostraba a quien administra como «imagen invalida».
  let imagen: ImagenOptimizada;
  let variantes: ObjetoSubible[];
  try {
    imagen = await optimizarImagen(
      Buffer.from(await archivo.arrayBuffer()),
      ext,
      opciones.anchoMaximo ?? ANCHO_MAXIMO,
    );
    // Las variantes tambien son procesado: si sharp falla aqui, el archivo sigue
    // siendo el culpable y el mensaje que se muestra tiene que ser el mismo.
    variantes = await crearVariantes(imagen.datos, imagen.ancho, nombre);
  } catch (fallo) {
    throw new ErrorImagenInvalida(fallo);
  }

  // El original y sus variantes viajan en un solo lote: o entran todos o no
  // entra ninguno (ver `subirLote`).
  await subirLote([
    { nombre, datos: imagen.datos, tipo: TIPOS_MIME[ext] ?? "application/octet-stream" },
    ...variantes,
  ]);

  return { url: `/uploads/${nombre}`, ancho: imagen.ancho, alto: imagen.alto };
}

/**
 * Devuelve tambien las medidas, no solo la URL: la pagina las necesita para
 * reservar el hueco exacto de la portada y que su carga no empuje el contenido.
 */
export async function guardarPortada(archivo: File, titulo: string): Promise<ImagenGuardada> {
  // `aRanura` es idempotente: el nombre final es el mismo de siempre.
  return guardarImagen(archivo, aRanura(titulo) || "portada", { anchoMaximo: ANCHO_MAXIMO });
}

export async function eliminarPortada(url: string): Promise<void> {
  if (!url.startsWith("/uploads/")) return; // portadas del repo no se tocan
  const nombre = url.slice("/uploads/".length);
  if (!esNombreSeguro(nombre)) return;
  // Se borran tambien las variantes: son archivos derivados que no significan
  // nada sin su original, y dejarlas seria pagar el bucket para siempre por
  // imagenes que ya nadie referencia. Se LISTAN por prefijo en vez de adivinar
  // nombres: una de las variantes va al ancho exacto del original, distinto
  // para cada imagen, y aqui solo se conoce la URL.
  const prefijo = `${PREFIJO}${prefijoVariantes(nombre)}`;
  const listado = await cliente.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefijo }));
  const variantes = (listado.Contents ?? [])
    .map((objeto) => objeto.Key)
    .filter((clave): clave is string => typeof clave === "string")
    .map((clave) => clave.slice(PREFIJO.length));
  await Promise.all([borrarClave(nombre), ...variantes.map(borrarClave)]);
}

/**
 * Borra el archivo del bucket sin dejar que su fallo tumbe la operacion.
 *
 * La fila de la base ya se guardo o se borro cuando esto corre: propagar el
 * error dejaria a quien administra viendo un 500 sobre un cambio que SI se
 * hizo, y al reintentar recibiria «no existe». Un objeto huerfano cuesta
 * centavos; un cambio consumado que se reporta como error cuesta confianza.
 * Se registra para que la fuga no quede invisible.
 */
export async function borrarDelBucket(url: string | null | undefined): Promise<void> {
  if (!url) return;
  try {
    await eliminarPortada(url);
  } catch (fallo) {
    registrarFallo(`borrar «${url}» del bucket`, fallo);
  }
}

export async function obtenerPortada(
  nombre: string,
): Promise<{ cuerpo: Uint8Array; tipo: string } | null> {
  if (!nombre || !esNombreSeguro(nombre)) return null;
  try {
    const respuesta = await cliente.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: `${PREFIJO}${nombre}` }),
    );
    if (!respuesta.Body) return null;
    return {
      cuerpo: await respuesta.Body.transformToByteArray(),
      tipo: TIPOS_MIME[extname(nombre).toLowerCase()] ?? "application/octet-stream",
    };
  } catch (fallo) {
    // Un objeto que no existe es normal (una fila vieja apuntando a un archivo
    // ya borrado) y no se registra. Cualquier otro fallo —firma invalida,
    // permisos, red— SI: sin esa linea, unas credenciales vencidas dejan todas
    // las imagenes del sitio en 404 y nada lo explica.
    const nombreFallo = fallo instanceof Error ? fallo.name : "";
    if (nombreFallo !== "NoSuchKey" && nombreFallo !== "NotFound") {
      registrarFallo(`leer «${nombre}» del bucket`, fallo);
    }
    return null;
  }
}
