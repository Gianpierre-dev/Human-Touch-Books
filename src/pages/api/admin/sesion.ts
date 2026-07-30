import type { APIRoute } from "astro";
import bcrypt from "bcryptjs";
import { bd } from "../../../lib/bd";
import { crearLimitadorIntentos, ipDelCliente } from "../../../lib/limite-intentos";
import { cabeceraCookieSesion, crearToken, versionClave } from "../../../lib/sesion";

export const prerender = false;

// Freno de fuerza bruta, en dos capas.
//
// 1) IP + correo, 5 fallos cada 15 minutos. La clave es compuesta a proposito:
//    solo por correo, cualquiera podria dejar sin acceso al administrador desde
//    otra maquina; solo por IP, una oficina entera comparte el mismo cupo.
const VENTANA_MS = 15 * 60 * 1000;
const INTENTOS_MAXIMOS = 5;
const limitador = crearLimitadorIntentos(INTENTOS_MAXIMOS, VENTANA_MS);

// 2) Solo correo, 20 fallos por hora. La capa 1 depende de resolver bien la IP,
//    y eso depende del proxy; esta no depende de nada externo: aunque alguien
//    rote la IP en cada peticion, la cuenta atacada tiene un techo por hora.
//    El umbral es holgado para que un despiste real no bloquee al administrador.
const VENTANA_CORREO_MS = 60 * 60 * 1000;
const INTENTOS_CORREO_MAXIMOS = 20;
const limitadorCorreo = crearLimitadorIntentos(INTENTOS_CORREO_MAXIMOS, VENTANA_CORREO_MS);

export const POST: APIRoute = async ({ request, redirect, clientAddress }) => {
  const datos = await request.formData();
  const correo = String(datos.get("correo") ?? "").trim().toLowerCase();
  const clave = String(datos.get("clave") ?? "");

  if (!correo || !clave) {
    return redirect("/admin/login?error=campos", 303);
  }

  const claveLimite = `${ipDelCliente(request, clientAddress)}|${correo}`;
  // Se comprueba antes de tocar la BD: durante el bloqueo no se prueba ninguna
  // contrasena, ni siquiera la correcta.
  if (limitador.superaLimite(claveLimite) || limitadorCorreo.superaLimite(correo)) {
    return redirect("/admin/login?error=limite", 303);
  }

  const usuario = await bd.usuario.findUnique({ where: { correo } });
  const hashComparar =
    usuario?.hashContrasena ??
    // hash ficticio: iguala el tiempo de respuesta cuando el correo no existe
    "$2a$12$C6UzMDM.H6dfI/f/IKcEeO7ZBpE0sSpm3MQo3xW3lQ5FJhQm3l9y6";
  const coincide = await bcrypt.compare(clave, hashComparar);

  if (!usuario || !coincide) {
    limitador.registrarFallo(claveLimite);
    limitadorCorreo.registrarFallo(correo);
    return redirect("/admin/login?error=credenciales", 303);
  }

  limitador.reiniciar(claveLimite);
  limitadorCorreo.reiniciar(correo);

  const token = crearToken({
    usuarioId: usuario.id,
    correo: usuario.correo,
    claveActualizadaEn: versionClave(usuario.claveActualizadaEn),
  });
  return new Response(null, {
    status: 303,
    headers: {
      Location: "/admin",
      "Set-Cookie": cabeceraCookieSesion(token),
    },
  });
};
