import type { APIRoute } from "astro";
import bcrypt from "bcryptjs";
import { bd } from "../../../lib/bd";
import { crearLimitadorIntentos } from "../../../lib/limite-intentos";
import {
  cabeceraCookieSesion,
  crearToken,
  LARGO_MAXIMO_CLAVE,
  LARGO_MINIMO_CLAVE,
  versionClave,
} from "../../../lib/sesion";
import {
  ErrorCuerpoExcedido,
  leerFormulario,
  respuestaCuerpoExcedido,
  TAMANO_FORMULARIO,
} from "../../../lib/cuerpo";

export const prerender = false;

// Freno de fuerza bruta contra la contrasena actual: 5 fallos cada 15 minutos
// por usuario. Aqui no hace falta la IP en la clave, porque la ruta ya exige
// sesion valida: lo que se protege es el caso de una sesion robada probando
// claves hasta dar con la actual.
const VENTANA_MS = 15 * 60 * 1000;
const INTENTOS_MAXIMOS = 5;
const limitador = crearLimitadorIntentos(INTENTOS_MAXIMOS, VENTANA_MS);

const COSTO_BCRYPT = 12;

function destino(parametros: string): string {
  return `/admin/cuenta?${parametros}`;
}

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  const sesion = locals.sesion;
  // El middleware ya bloquea /api/admin sin sesion; esto solo cierra el tipo.
  if (!sesion) return redirect("/admin/login", 303);

  let datos: FormData;
  try {
    datos = await leerFormulario(request, TAMANO_FORMULARIO);
  } catch (fallo) {
    if (fallo instanceof ErrorCuerpoExcedido) return respuestaCuerpoExcedido();
    throw fallo;
  }
  const actual = String(datos.get("actual") ?? "");
  const nueva = String(datos.get("nueva") ?? "");
  const confirmacion = String(datos.get("confirmacion") ?? "");

  if (limitador.superaLimite(sesion.usuarioId)) {
    return redirect(destino("error=limite"), 303);
  }

  if (!actual || !nueva || !confirmacion) {
    return redirect(destino("error=campos"), 303);
  }

  // El minlength/maxlength del navegador se puede saltar: manda esta validacion.
  if (nueva.length < LARGO_MINIMO_CLAVE || nueva.length > LARGO_MAXIMO_CLAVE) {
    return redirect(destino("error=largo"), 303);
  }

  if (nueva !== confirmacion) {
    return redirect(destino("error=confirmacion"), 303);
  }

  const usuario = await bd.usuario.findUnique({ where: { id: sesion.usuarioId } });
  if (!usuario) return redirect(destino("error=usuario"), 303);

  const coincide = await bcrypt.compare(actual, usuario.hashContrasena);
  if (!coincide) {
    limitador.registrarFallo(sesion.usuarioId);
    return redirect(destino("error=actual"), 303);
  }

  limitador.reiniciar(sesion.usuarioId);

  const hashContrasena = await bcrypt.hash(nueva, COSTO_BCRYPT);
  // La marca sube en el mismo update que el hash: a partir de aqui todos los
  // tokens emitidos antes quedan invalidados por el middleware. Es justo lo que
  // protege del escenario de arriba: la sesion robada muere con el cambio.
  const actualizado = await bd.usuario.update({
    where: { id: usuario.id },
    data: { hashContrasena, claveActualizadaEn: new Date() },
  });

  // Cookie nueva: el cambio de clave no debe echar de la sesion a quien lo hizo.
  const token = crearToken({
    usuarioId: actualizado.id,
    correo: actualizado.correo,
    claveActualizadaEn: versionClave(actualizado.claveActualizadaEn),
  });
  return new Response(null, {
    status: 303,
    headers: {
      Location: destino("ok=guardado"),
      "Set-Cookie": cabeceraCookieSesion(token),
    },
  });
};
