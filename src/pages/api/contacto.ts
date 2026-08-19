import type { APIRoute } from "astro";
import { bd } from "../../lib/bd";
import { crearLimitadorIntentos, ipDelCliente } from "../../lib/limite-intentos";
import { registrarFallo } from "../../lib/registro";
import { ErrorCuerpoExcedido, leerFormulario } from "../../lib/cuerpo";

export const prerender = false;

// Ruta publica: el middleware solo protege /admin y /api/admin.
const DESTINO_OK = "/?contacto=ok#contacto";

function destinoError(campo?: string): string {
  return campo
    ? `/?contacto=error&campo=${encodeURIComponent(campo)}#contacto`
    : "/?contacto=error#contacto";
}

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Al menos 6 digitos reales, ademas de los separadores permitidos.
const TELEFONO = /^(?=(?:\D*\d){6,})[\d\s+()-]{7,20}$/;

const TAMANO_MAXIMO_CUERPO = 100_000; // bytes

// Limite de envios por IP: 3 cada 10 minutos, en memoria del proceso.
const VENTANA_MS = 10 * 60 * 1000;
const ENVIOS_MAXIMOS = 3;
const limitador = crearLimitadorIntentos(ENVIOS_MAXIMOS, VENTANA_MS);

const LIMITES = {
  nombre: 120,
  correo: 160,
  telefono: 20,
  asunto: 120,
  mensaje: 2000,
} as const;

interface DatosMensaje {
  nombre: string;
  correo: string;
  telefono: string;
  asunto: string;
  mensaje: string;
}

function texto(formulario: FormData, clave: string): string {
  const valor = formulario.get(clave);
  // Un File enviado en un campo de texto se serializa como "[object File]".
  if (valor === null || valor instanceof File) return "";
  return valor.trim();
}

function leerDatosMensaje(formulario: FormData): { datos?: DatosMensaje; campo?: string } {
  const nombre = texto(formulario, "nombre");
  const correo = texto(formulario, "correo");
  const telefono = texto(formulario, "telefono");
  const asunto = texto(formulario, "asunto");
  const mensaje = texto(formulario, "mensaje");

  if (!nombre || nombre.length > LIMITES.nombre) return { campo: "nombre" };
  if (!correo || correo.length > LIMITES.correo || !CORREO.test(correo)) return { campo: "correo" };
  if (!telefono || !TELEFONO.test(telefono)) return { campo: "telefono" };
  if (!asunto || asunto.length > LIMITES.asunto) return { campo: "asunto" };
  if (!mensaje || mensaje.length > LIMITES.mensaje) return { campo: "mensaje" };

  return { datos: { nombre, correo, telefono, asunto, mensaje } };
}

export const POST: APIRoute = async ({ request, redirect, clientAddress }) => {
  try {
    const ip = ipDelCliente(request, clientAddress);
    if (limitador.superaLimite(ip)) {
      return redirect(destinoError("limite"), 303);
    }

    // El tope se aplica contando los bytes que llegan, no leyendo
    // Content-Length: esa cabecera puede faltar (Transfer-Encoding: chunked) o
    // no ser un numero, y en los dos casos el cuerpo entraba entero.
    let formulario: FormData;
    try {
      formulario = await leerFormulario(request, TAMANO_MAXIMO_CUERPO);
    } catch (fallo) {
      if (fallo instanceof ErrorCuerpoExcedido) return redirect(destinoError("tamano"), 303);
      throw fallo;
    }

    // Trampa antispam: un bot rellena todos los campos, una persona no ve este.
    // Se responde como exito para no darle pistas al bot.
    if (texto(formulario, "sitio_web") !== "") return redirect(DESTINO_OK, 303);

    const { datos, campo } = leerDatosMensaje(formulario);
    if (!datos) return redirect(destinoError(campo), 303);

    await bd.mensaje.create({ data: datos });
    // El cupo se gasta solo cuando el mensaje entra de verdad: si se anotara al
    // comprobarlo, un formulario mal llenado (o un bot mandando basura) dejaria
    // sin cupo a una persona que todavia no logro enviar nada.
    limitador.registrarIntento(ip);
    return redirect(DESTINO_OK, 303);
  } catch (fallo) {
    // Este es el UNICO canal de captacion del sitio: si la base no responde,
    // el colegio ve un aviso generico, se va, y sin esta linea nadie se entera
    // de que hubo consultas perdidas. El visitante recibe el mismo mensaje de
    // siempre; la diferencia es que el incidente queda registrado.
    registrarFallo("registrar mensaje de contacto", fallo);
    return redirect(destinoError(), 303);
  }
};
