import type { APIRoute } from "astro";
import bcrypt from "bcryptjs";
import { bd } from "../../../lib/bd";
import { crearLimitadorIntentos, ipDelCliente } from "../../../lib/limite-intentos";
import { ErrorCuerpoExcedido, leerFormulario, TAMANO_FORMULARIO } from "../../../lib/cuerpo";
import { guardarBorrador } from "../../../lib/borrador";
import type { AstroCookies } from "astro";
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

// Devuelve el correo escrito para no obligar a reescribirlo tras un fallo. La
// CONTRASENA no viaja aqui jamas: solo se guarda este unico campo, y ademas el
// helper descarta por su cuenta cualquier campo de clave.
const COOKIE_BORRADOR = "borrador_login";
const RUTA_BORRADOR = "/admin/login";

function recordarCorreo(cookies: AstroCookies, correo: string): void {
  const soloCorreo = new FormData();
  soloCorreo.set("correo", correo);
  guardarBorrador({ cookies, nombre: COOKIE_BORRADOR, ruta: RUTA_BORRADOR }, soloCorreo);
}

export const POST: APIRoute = async ({ request, redirect, clientAddress, cookies }) => {
  // Este endpoint esta exento de sesion (ver src/middleware.ts): es el unico
  // sitio del panel al que se puede enviar un cuerpo sin credenciales, asi que
  // acotarlo ANTES de materializarlo no es una precaucion teorica.
  let datos: FormData;
  try {
    datos = await leerFormulario(request, TAMANO_FORMULARIO);
  } catch (fallo) {
    if (fallo instanceof ErrorCuerpoExcedido) {
      return redirect("/admin/login?error=tamano", 303);
    }
    throw fallo;
  }
  const correo = String(datos.get("correo") ?? "")
    .trim()
    .toLowerCase();
  const clave = String(datos.get("clave") ?? "");

  if (!correo || !clave) {
    recordarCorreo(cookies, correo);
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
    recordarCorreo(cookies, correo);
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
