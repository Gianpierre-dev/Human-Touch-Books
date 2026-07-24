import type { APIRoute } from "astro";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { rutaAbsolutaSubida } from "../../lib/almacen";

export const prerender = false;

const TIPOS: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export const GET: APIRoute = async ({ params }) => {
  const nombre = params.ruta ?? "";
  const ruta = rutaAbsolutaSubida(nombre);
  if (!ruta) return new Response("No encontrado", { status: 404 });

  try {
    const contenido = await readFile(ruta);
    const tipo = TIPOS[extname(nombre).toLowerCase()] ?? "application/octet-stream";
    return new Response(new Uint8Array(contenido), {
      headers: {
        "Content-Type": tipo,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("No encontrado", { status: 404 });
  }
};
