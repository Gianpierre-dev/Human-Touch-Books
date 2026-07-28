import type { APIRoute } from "astro";
import { bd } from "../../../../lib/bd";
import { leerDatosPregunta } from "../../../../lib/preguntas";

export const prerender = false;

const DESTINO = "/admin/preguntas";

export const POST: APIRoute = async ({ request, redirect }) => {
  const formulario = await request.formData();
  const { datos, error } = leerDatosPregunta(formulario);
  if (!datos) return redirect(`${DESTINO}?error=${error}`, 303);

  await bd.pregunta.create({ data: datos });
  return redirect(`${DESTINO}?ok=creada`, 303);
};
