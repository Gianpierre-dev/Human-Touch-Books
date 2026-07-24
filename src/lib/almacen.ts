import { mkdir, writeFile, rm } from "node:fs/promises";
import { join, extname } from "node:path";

// Almacenamiento local de portadas. En Railway conviene montar un volumen en
// /app/uploads para que las imagenes sobrevivan a los despliegues. La interfaz
// queda lista para cambiar a S3/Wasabi sin tocar el resto del codigo.
const DIRECTORIO = join(process.cwd(), "uploads");
const EXTENSIONES_PERMITIDAS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const TAMANO_MAXIMO = 5 * 1024 * 1024; // 5 MB

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
  await mkdir(DIRECTORIO, { recursive: true });
  const bytes = Buffer.from(await archivo.arrayBuffer());
  await writeFile(join(DIRECTORIO, nombre), bytes);
  return `/uploads/${nombre}`;
}

export async function eliminarPortada(url: string): Promise<void> {
  if (!url.startsWith("/uploads/")) return; // portadas del repo no se tocan
  const nombre = url.slice("/uploads/".length);
  if (nombre.includes("/") || nombre.includes("..")) return;
  await rm(join(DIRECTORIO, nombre), { force: true });
}

export function rutaAbsolutaSubida(nombre: string): string | null {
  if (nombre.includes("..") || nombre.includes("/") || nombre.includes("\\")) return null;
  return join(DIRECTORIO, nombre);
}
