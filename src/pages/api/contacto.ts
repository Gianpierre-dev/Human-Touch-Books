import type { APIRoute } from "astro";
import { bd } from "../../lib/bd";
import { ipDelCliente } from "../../lib/limite-intentos";

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
const IPS_MAXIMAS = 10_000;
const enviosPorIp = new Map<string, number[]>();

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

// Consultar y registrar van separados a proposito: si el registro ocurriera en
// la consulta, un formulario mal llenado (o un bot mandando basura) gastaria el
// cupo de una persona que todavia no logro enviar nada.
function superaLimite(ip: string): boolean {
  return vigentes(ip).length >= ENVIOS_MAXIMOS;
}

function registrarEnvio(ip: string): void {
  const marcas = vigentes(ip);
  // Techo de claves: descarta la mas antigua (Map itera por orden de insercion).
  if (!enviosPorIp.has(ip) && enviosPorIp.size >= IPS_MAXIMAS) {
    const masAntigua = enviosPorIp.keys().next().value;
    if (masAntigua !== undefined) enviosPorIp.delete(masAntigua);
  }
  enviosPorIp.set(ip, [...marcas, Date.now()]);
}

// Purga perezosa: solo la IP consultada, no el Map entero en cada peticion.
function vigentes(ip: string): number[] {
  const ahora = Date.now();
  const marcas = (enviosPorIp.get(ip) ?? []).filter((marca) => ahora - marca < VENTANA_MS);
  if (marcas.length === 0) enviosPorIp.delete(ip);
  else enviosPorIp.set(ip, marcas);
  return marcas;
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
    // Corta cuerpos desproporcionados antes de materializar el formulario.
    const tamano = Number(request.headers.get("content-length") ?? "0");
    if (tamano > TAMANO_MAXIMO_CUERPO) return redirect(destinoError("tamano"), 303);

    const ip = ipDelCliente(request, clientAddress);
    if (superaLimite(ip)) {
      return redirect(destinoError("limite"), 303);
    }

    const formulario = await request.formData();

    // Trampa antispam: un bot rellena todos los campos, una persona no ve este.
    // Se responde como exito para no darle pistas al bot.
    if (texto(formulario, "sitio_web") !== "") return redirect(DESTINO_OK, 303);

    const { datos, campo } = leerDatosMensaje(formulario);
    if (!datos) return redirect(destinoError(campo), 303);

    await bd.mensaje.create({ data: datos });
    // El cupo se gasta solo cuando el mensaje entra de verdad.
    registrarEnvio(ip);
    return redirect(DESTINO_OK, 303);
  } catch {
    return redirect(destinoError(), 303);
  }
};
