import type { APIRoute } from "astro";
import { obtenerPortada } from "../../lib/almacen";

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const portada = await obtenerPortada(params.ruta ?? "");
  if (!portada) return new Response("No encontrado", { status: 404 });

  // `Buffer.from` no es decorativo: el SDK devuelve `Uint8Array<ArrayBufferLike>`
  // y `BodyInit` exige una vista sobre `ArrayBuffer` (ArrayBufferLike admite
  // ademas SharedArrayBuffer, que no se puede enviar). El Buffer fija ese tipo.
  return new Response(Buffer.from(portada.cuerpo), {
    headers: {
      "Content-Type": portada.tipo,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};
