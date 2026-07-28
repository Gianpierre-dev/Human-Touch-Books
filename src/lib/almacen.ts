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

// Redimensiona y comprime la portada conservando su formato original, para que
// la extension, el tipo MIME y la URL guardada en la base de datos no cambien.
async function optimizarPortada(bytes: Buffer, ext: string): Promise<Buffer> {
  const base = sharp(bytes)
    .rotate() // respeta la orientacion EXIF de las fotos de camara
    .resize({ width: ANCHO_MAXIMO, withoutEnlargement: true });

  if (ext === ".png") return base.png({ compressionLevel: 9 }).toBuffer();
  if (ext === ".webp") return base.webp({ quality: 82 }).toBuffer();
  return base.jpeg({ quality: 82, progressive: true, mozjpeg: true }).toBuffer();
}

export async function guardarPortada(archivo: File, titulo: string): Promise<string> {
  const ext = extname(archivo.name).toLowerCase();
  const base = titulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  const nombre = `${base || "portada"}-${Date.now()}${ext}`;
  const bytes = await optimizarPortada(Buffer.from(await archivo.arrayBuffer()), ext);
  await cliente.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: `${PREFIJO}${nombre}`,
      Body: bytes,
      ContentType: TIPOS_MIME[ext] ?? "application/octet-stream",
    }),
  );
  return `/uploads/${nombre}`;
}

export async function eliminarPortada(url: string): Promise<void> {
  if (!url.startsWith("/uploads/")) return; // portadas del repo no se tocan
  const nombre = url.slice("/uploads/".length);
  if (!esNombreSeguro(nombre)) return;
  await cliente.send(
    new DeleteObjectCommand({ Bucket: BUCKET, Key: `${PREFIJO}${nombre}` }),
  );
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
