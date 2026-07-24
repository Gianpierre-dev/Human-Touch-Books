import { defineMiddleware } from "astro:middleware";
import { COOKIE_SESION, verificarToken } from "./lib/sesion";

const METODOS_SEGUROS = new Set(["GET", "HEAD", "OPTIONS"]);

// Proteccion CSRF por cabeceras: el Origin del navegador debe coincidir con el
// host publico de la peticion (X-Forwarded-Host detras del proxy de Railway).
// Complementa la cookie SameSite=Lax, que ya excluye el envio cross-site.
function origenValido(request: Request): boolean {
  const origen = request.headers.get("origin");
  if (!origen) return true; // clientes sin Origin (no navegadores)
  const hostPublico =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  try {
    return new URL(origen).host === hostPublico;
  } catch {
    return false;
  }
}

// Protege el panel y su API. Todo lo demas es publico.
export const onRequest = defineMiddleware((contexto, siguiente) => {
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
    // Si ya hay sesion, no tiene sentido ver el login.
    if (sesion && pathname === "/admin/login") {
      return contexto.redirect("/admin", 302);
    }
    return siguiente();
  }

  if (!sesion) {
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
