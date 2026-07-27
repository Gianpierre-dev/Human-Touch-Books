import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { extname } from "node:path";

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
  const bytes = Buffer.from(await archivo.arrayBuffer());
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
