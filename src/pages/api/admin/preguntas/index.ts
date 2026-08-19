import type { APIRoute } from "astro";
import { bd } from "../../../../lib/bd";
import { leerDatosPregunta } from "../../../../lib/preguntas";
import {
  ErrorCuerpoExcedido,
  leerFormulario,
  respuestaCuerpoExcedido,
  TAMANO_FORMULARIO,
} from "../../../../lib/cuerpo";

export const prerender = false;

const DESTINO = "/admin/preguntas";

export const POST: APIRoute = async ({ request, redirect }) => {
  let formulario: FormData;
  try {
    formulario = await leerFormulario(request, TAMANO_FORMULARIO);
  } catch (fallo) {
    if (fallo instanceof ErrorCuerpoExcedido) return respuestaCuerpoExcedido();
    throw fallo;
  }
  const { datos, error } = leerDatosPregunta(formulario);
  if (!datos) return redirect(`${DESTINO}?error=${error}`, 303);

  await bd.pregunta.create({ data: datos });
  return redirect(`${DESTINO}?ok=creada`, 303);
};
