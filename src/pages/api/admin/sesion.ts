import type { APIRoute } from "astro";
import bcrypt from "bcryptjs";
import { bd } from "../../../lib/bd";
import { cabeceraCookieSesion, crearToken } from "../../../lib/sesion";

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  const datos = await request.formData();
  const correo = String(datos.get("correo") ?? "").trim().toLowerCase();
  const clave = String(datos.get("clave") ?? "");

  if (!correo || !clave) {
    return redirect("/admin/login?error=campos", 303);
  }

  const usuario = await bd.usuario.findUnique({ where: { correo } });
  const hashComparar =
    usuario?.hashContrasena ??
    // hash ficticio: iguala el tiempo de respuesta cuando el correo no existe
    "$2a$12$C6UzMDM.H6dfI/f/IKcEeO7ZBpE0sSpm3MQo3xW3lQ5FJhQm3l9y6";
  const coincide = await bcrypt.compare(clave, hashComparar);

  if (!usuario || !coincide) {
    return redirect("/admin/login?error=credenciales", 303);
  }

  const token = crearToken({ usuarioId: usuario.id, correo: usuario.correo });
  return new Response(null, {
    status: 303,
    headers: {
      Location: "/admin",
      "Set-Cookie": cabeceraCookieSesion(token),
    },
  });
};
