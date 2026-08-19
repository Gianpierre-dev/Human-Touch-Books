import type { APIRoute } from "astro";
import { bd } from "../../../../../lib/bd";
import { leerContenidoPagina } from "../../../../../lib/paginas";
import {
  ErrorCuerpoExcedido,
  leerFormulario,
  respuestaCuerpoExcedido,
  TAMANO_FORMULARIO,
} from "../../../../../lib/cuerpo";

export const prerender = false;

const DESTINO = "/admin/paginas";

// Textos de la pagina publica. Ninguno es obligatorio: el vacio se guarda como
// `null` y la seccion correspondiente simplemente no se dibuja.
export const POST: APIRoute = async ({ params, request, redirect }) => {
  const id = params.id ?? "";
  const pagina = await bd.paginaInstitucional.findUnique({ where: { id }, select: { id: true } });
  if (!pagina) return redirect(`${DESTINO}?error=noexiste`, 303);

  let formulario: FormData;
  try {
    formulario = await leerFormulario(request, TAMANO_FORMULARIO);
  } catch (fallo) {
    if (fallo instanceof ErrorCuerpoExcedido) return respuestaCuerpoExcedido();
    throw fallo;
  }
  const { datos, error } = leerContenidoPagina(formulario);
  if (!datos) return redirect(`${DESTINO}?error=${error}#contenido-${id}`, 303);

  await bd.paginaInstitucional.update({ where: { id }, data: datos });
  return redirect(`${DESTINO}?ok=contenido#contenido-${id}`, 303);
};
