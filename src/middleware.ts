import { defineMiddleware, sequence } from "astro:middleware";
import { gzipSync } from "node:zlib";
import { bd } from "./lib/bd";
import { COOKIE_SESION, verificarToken, versionClave, type CargaSesion } from "./lib/sesion";

const METODOS_SEGUROS = new Set(["GET", "HEAD", "OPTIONS"]);

// Proteccion CSRF por cabeceras: el Origin del navegador debe coincidir con el
// host publico de la peticion (X-Forwarded-Host detras del proxy de Railway).
// Complementa la cookie SameSite=Lax, que ya excluye el envio cross-site.
function origenValido(request: Request): boolean {
  const origen = request.headers.get("origin");
  if (!origen) return true; // clientes sin Origin (no navegadores)
  const hostPublico = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  try {
    return new URL(origen).host === hostPublico;
  } catch {
    return false;
  }
}

// La firma del token solo prueba que lo emitimos nosotros, no que siga
// valiendo. Un JWT no se puede revocar, asi que la contrasena lleva version:
// si cambio despues de emitirse el token, ese token ya no sirve.
async function sesionVigente(sesion: CargaSesion): Promise<boolean> {
  const usuario = await bd.usuario.findUnique({
    where: { id: sesion.usuarioId },
    select: { claveActualizadaEn: true },
  });
  if (!usuario) return false;
  return sesion.claveActualizadaEn >= versionClave(usuario.claveActualizadaEn);
}

// Compresion de las respuestas del servidor. El adaptador de Node no comprime
// lo que renderiza (el HTML salia plano, ~58 KB que en gzip son ~9); los
// archivos estaticos no pasan por aqui, el adaptador los sirve antes. Se
// almacena el cuerpo completo en memoria a proposito: las paginas del sitio
// pesan menos de 60 KB y a ese tamano el streaming no aporta nada.
const TIPOS_COMPRIMIBLES = /^(?:text\/|application\/(?:json|xml|rss\+xml|javascript))/;
const TAMANO_MINIMO_COMPRESION = 1024;

const comprimir = defineMiddleware(async (contexto, siguiente) => {
  const respuesta = await siguiente();
  const tipo = respuesta.headers.get("content-type") ?? "";
  const acepta = contexto.request.headers.get("accept-encoding") ?? "";
  if (
    contexto.request.method === "HEAD" ||
    respuesta.status === 204 ||
    respuesta.status === 304 ||
    !respuesta.body ||
    respuesta.headers.has("content-encoding") ||
    !TIPOS_COMPRIMIBLES.test(tipo) ||
    !/\bgzip\b/i.test(acepta)
  ) {
    return respuesta;
  }

  const cuerpo = Buffer.from(await respuesta.arrayBuffer());
  if (cuerpo.byteLength < TAMANO_MINIMO_COMPRESION) {
    return new Response(cuerpo, respuesta);
  }

  const comprimido = gzipSync(cuerpo, { level: 6 });
  const cabeceras = new Headers(respuesta.headers);
  cabeceras.set("Content-Encoding", "gzip");
  cabeceras.set("Content-Length", String(comprimido.byteLength));
  cabeceras.append("Vary", "Accept-Encoding");
  return new Response(comprimido, {
    status: respuesta.status,
    statusText: respuesta.statusText,
    headers: cabeceras,
  });
});

// Protege el panel y su API. Todo lo demas es publico.
const protegerPanel = defineMiddleware(async (contexto, siguiente) => {
  const { request, url, cookies } = contexto;

  if (!METODOS_SEGUROS.has(request.method) && !origenValido(request)) {
    return new Response("Origen no permitido", { status: 403 });
  }

  const { pathname } = url;
  const esPanel = pathname.startsWith("/admin");
  const esApiPanel = pathname.startsWith("/api/admin");
  if (!esPanel && !esApiPanel) return siguiente();

  const esLogin = pathname === "/admin/login" || pathname === "/api/admin/sesion";
  const sesion = verificarToken(cookies.get(COOKIE_SESION)?.value);

  if (esLogin) {
    // Si ya hay sesion (y sigue vigente), no tiene sentido ver el login.
    if (sesion && pathname === "/admin/login" && (await sesionVigente(sesion))) {
      return contexto.redirect("/admin", 302);
    }
    return siguiente();
  }

  if (!sesion || !(await sesionVigente(sesion))) {
    if (esApiPanel) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    return contexto.redirect("/admin/login", 302);
  }

  contexto.locals.sesion = sesion;
  return siguiente();
});

// La compresion va por fuera: envuelve la respuesta que produzca el resto.
export const onRequest = sequence(comprimir, protegerPanel);
