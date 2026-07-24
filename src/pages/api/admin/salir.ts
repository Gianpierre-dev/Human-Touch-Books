import type { APIRoute } from "astro";
import { cabeceraCookieSalir } from "../../../lib/sesion";

export const prerender = false;

export const POST: APIRoute = async () => {
  return new Response(null, {
    status: 303,
    headers: {
      Location: "/admin/login",
      "Set-Cookie": cabeceraCookieSalir(),
    },
  });
};
