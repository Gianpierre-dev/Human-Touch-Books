import type { APIRoute } from "astro";
import { bd } from "../../../../lib/bd";
import { LIMITES_BLOQUE, leerDatosBloque } from "../../../../lib/bloques";

export const prerender = false;

const DESTINO = "/admin/bloques";

export const POST: APIRoute = async ({ request, redirect }) => {
  const formulario = await request.formData();
  const { datos, error } = leerDatosBloque(formulario, LIMITES_BLOQUE);
  if (!datos) return redirect(`${DESTINO}?error=${error}`, 303);

  await bd.bloqueValor.create({ data: datos });
  return redirect(`${DESTINO}?ok=creado`, 303);
};
