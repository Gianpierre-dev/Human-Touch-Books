import type { APIRoute } from "astro";
import { bd } from "../../lib/bd";

export const prerender = false;

// Ruta publica: el middleware solo protege /admin y /api/admin.
// La usa el healthcheck del despliegue, asi que no basta con responder que el
// proceso vive: una instancia sin base de datos no puede atender nada util.
export const GET: APIRoute = async () => {
  try {
    await bd.$queryRaw`SELECT 1`;
    return respuesta({ estado: "ok" }, 200);
  } catch (error) {
    // El unico rastro del motivo: los logs del despliegue son donde se mira
    // cuando el healthcheck deja la instancia como no saludable.
    console.error("healthcheck: la base de datos no responde", error);
    return respuesta({ estado: "error" }, 503);
  }
};

function respuesta(cuerpo: { estado: string }, estado: number): Response {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: {
      "Content-Type": "application/json",
      // Nunca cacheado: un healthcheck guardado no informa de nada.
      "Cache-Control": "no-store",
    },
  });
}
