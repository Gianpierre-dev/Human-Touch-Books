import type { APIRoute } from "astro";
import { bd } from "../../lib/bd";

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

function obtenerIp(request: Request, direccionCliente: string): string {
  const reenviada = request.headers.get("x-forwarded-for");
  if (!reenviada) return direccionCliente;
  const primera = reenviada.split(",")[0]?.trim();
  return primera || direccionCliente;
}

function superaLimite(ip: string): boolean {
  const ahora = Date.now();

  // Purga las IPs cuya ventana ya vencio para que el Map no crezca sin control.
  for (const [clave, marcas] of enviosPorIp) {
    const vigentes = marcas.filter((marca) => ahora - marca < VENTANA_MS);
    if (vigentes.length === 0) enviosPorIp.delete(clave);
    else enviosPorIp.set(clave, vigentes);
  }

  const marcas = enviosPorIp.get(ip) ?? [];
  if (marcas.length >= ENVIOS_MAXIMOS) return true;

  enviosPorIp.set(ip, [...marcas, ahora]);
  return false;
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

    if (superaLimite(obtenerIp(request, clientAddress))) {
      return redirect(destinoError("limite"), 303);
    }

    const formulario = await request.formData();

    // Trampa antispam: un bot rellena todos los campos, una persona no ve este.
    // Se responde como exito para no darle pistas al bot.
    if (texto(formulario, "sitio_web") !== "") return redirect(DESTINO_OK, 303);

    const { datos, campo } = leerDatosMensaje(formulario);
    if (!datos) return redirect(destinoError(campo), 303);

    await bd.mensaje.create({ data: datos });
    return redirect(DESTINO_OK, 303);
  } catch {
    return redirect(destinoError(), 303);
  }
};
