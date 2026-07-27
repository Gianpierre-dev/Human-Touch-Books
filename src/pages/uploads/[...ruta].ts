import type { APIRoute } from "astro";
import { obtenerPortada } from "../../lib/almacen";

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const portada = await obtenerPortada(params.ruta ?? "");
  if (!portada) return new Response("No encontrado", { status: 404 });

  return new Response(portada.cuerpo, {
    headers: {
      "Content-Type": portada.tipo,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};
