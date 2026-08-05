import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { extname } from "node:path";
import sharp from "sharp";

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

const BUCKET = process.env.WASABI_BUCKET_NAME ?? "";

// Las portadas se muestran como maximo a ~450 px de ancho; 1200 cubre pantallas
// de alta densidad sin arrastrar los 3 MB que suele pesar el archivo original.
const ANCHO_MAXIMO = 1200;

// Las imagenes de secciones fijas ocupan hasta ~800 px de ancho: 1600 les da
// el mismo margen de alta densidad que 1200 a las tapas.
export const ANCHO_IMAGEN_SITIO = 1600;

// Las del hero cubren la seccion completa, de borde a borde: 1920 evita que
// lleguen blandas a un monitor grande. Solo afecta a subidas nuevas.
export const ANCHO_IMAGEN_HERO = 1920;

const cliente = new S3Client({
  region: process.env.WASABI_REGION,
  endpoint: process.env.WASABI_ENDPOINT,
  credentials: {
    accessKeyId: process.env.WASABI_ACCESS_KEY ?? "",
    secretAccessKey: process.env.WASABI_SECRET_KEY ?? "",
  },
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
  const imagen = await optimizarImagen(
    Buffer.from(await archivo.arrayBuffer()),
    ext,
    opciones.anchoMaximo ?? ANCHO_MAXIMO,
  );
  await cliente.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: `${PREFIJO}${nombre}`,
      Body: imagen.datos,
      ContentType: TIPOS_MIME[ext] ?? "application/octet-stream",
    }),
  );
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
  } catch {
    return null; // objeto inexistente o error de acceso
  }
}
