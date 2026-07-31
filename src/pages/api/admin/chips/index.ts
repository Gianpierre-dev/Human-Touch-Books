import type { APIRoute } from "astro";
import { bd } from "../../../../lib/bd";
import { LIMITES_CHIP, leerDatosBloque } from "../../../../lib/bloques";

export const prerender = false;

const DESTINO = "/admin/chips";

export const POST: APIRoute = async ({ request, redirect }) => {
  const formulario = await request.formData();
  const { datos, error } = leerDatosBloque(formulario, LIMITES_CHIP);
  if (!datos) return redirect(`${DESTINO}?error=${error}`, 303);

  await bd.chipPlataforma.create({ data: datos });
  return redirect(`${DESTINO}?ok=creado`, 303);
};
