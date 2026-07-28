import type { APIRoute } from "astro";
import { bd } from "../../../../lib/bd";

export const prerender = false;

export const POST: APIRoute = async ({ params, redirect }) => {
  const id = params.id ?? "";
  const mensaje = await bd.mensaje.findUnique({ where: { id } });
  if (!mensaje) return redirect("/admin/mensajes?error=noexiste", 303);

  await bd.mensaje.update({ where: { id }, data: { atendido: !mensaje.atendido } });
  return redirect("/admin/mensajes?ok=actualizado", 303);
};
