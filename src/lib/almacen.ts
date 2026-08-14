import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { extname } from "node:path";
import sharp from "sharp";
import { ENTORNO } from "./entorno";
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

// Las portadas se muestran como maximo a ~450 px de ancho; 1200 cubre pantallas
// de alta densidad sin arrastrar los 3 MB que suele pesar el archivo original.
const ANCHO_MAXIMO = 1200;

// Las imagenes de secciones fijas ocupan hasta ~800 px de ancho: 1600 les da
// el mismo margen de alta densidad que 1200 a las tapas.
export const ANCHO_IMAGEN_SITIO = 1600;

// Las del hero cubren la seccion completa, de borde a borde: 1920 evita que
// lleguen blandas a un monitor grande. Solo afecta a subidas nuevas.
export const ANCHO_IMAGEN_HERO = 1920;

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
  try {
    imagen = await optimizarImagen(
      Buffer.from(await archivo.arrayBuffer()),
      ext,
      opciones.anchoMaximo ?? ANCHO_MAXIMO,
    );
  } catch (fallo) {
    throw new ErrorImagenInvalida(fallo);
  }

  try {
    await cliente.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: `${PREFIJO}${nombre}`,
        Body: imagen.datos,
        ContentType: TIPOS_MIME[ext] ?? "application/octet-stream",
      }),
    );
  } catch (fallo) {
    registrarFallo(`guardar «${nombre}» en el bucket`, fallo);
    throw new ErrorAlmacenamiento("guardar la imagen", fallo);
  }

  return { url: `/uploads/${nombre}`, ancho: imagen.ancho, alto: imagen.alto };
}

export async function guardarPortada(archivo: File, titulo: string): Promise<string> {
  // `aRanura` es idempotente: el nombre final es el mismo de siempre.
  const { url } = await guardarImagen(archivo, aRanura(titulo) || "portada", {
    anchoMaximo: ANCHO_MAXIMO,
  });
  return url;
}

export async function eliminarPortada(url: string): Promise<void> {
  if (!url.startsWith("/uploads/")) return; // portadas del repo no se tocan
  const nombre = url.slice("/uploads/".length);
  if (!esNombreSeguro(nombre)) return;
  await cliente.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: `${PREFIJO}${nombre}` }));
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
