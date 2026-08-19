import type { APIRoute } from "astro";
import { bd } from "../../../../lib/bd";
import { LIMITES_CHIP, leerDatosBloque } from "../../../../lib/bloques";
import {
  ErrorCuerpoExcedido,
  leerFormulario,
  respuestaCuerpoExcedido,
  TAMANO_FORMULARIO,
} from "../../../../lib/cuerpo";

export const prerender = false;

const DESTINO = "/admin/chips";

export const POST: APIRoute = async ({ request, redirect }) => {
  let formulario: FormData;
  try {
    formulario = await leerFormulario(request, TAMANO_FORMULARIO);
  } catch (fallo) {
    if (fallo instanceof ErrorCuerpoExcedido) return respuestaCuerpoExcedido();
    throw fallo;
  }
  const { datos, error } = leerDatosBloque(formulario, LIMITES_CHIP);
  if (!datos) return redirect(`${DESTINO}?error=${error}`, 303);

  await bd.chipPlataforma.create({ data: datos });
  return redirect(`${DESTINO}?ok=creado`, 303);
};
