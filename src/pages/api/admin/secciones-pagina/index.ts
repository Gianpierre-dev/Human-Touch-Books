import type { APIRoute } from "astro";
import { bd } from "../../../../lib/bd";
import { leerDatosSeccion } from "../../../../lib/paginas";
import {
  ErrorCuerpoExcedido,
  leerFormulario,
  respuestaCuerpoExcedido,
  TAMANO_FORMULARIO,
} from "../../../../lib/cuerpo";

export const prerender = false;

// Alta de una seccion grande (Mision, Vision...). La pagina viaja como campo
// oculto del formulario porque el alta no tiene id propio todavia.
export const POST: APIRoute = async ({ request, redirect }) => {
  let formulario: FormData;
  try {
    formulario = await leerFormulario(request, TAMANO_FORMULARIO);
  } catch (fallo) {
    if (fallo instanceof ErrorCuerpoExcedido) return respuestaCuerpoExcedido();
    throw fallo;
  }

  const paginaId = String(formulario.get("pagina_id") ?? "");
  const pagina = await bd.paginaInstitucional.findUnique({
    where: { id: paginaId },
    select: { id: true },
  });
  if (!pagina) return redirect("/admin/paginas?error=noexiste", 303);

  const destino = `/admin/paginas/${paginaId}/bloques`;

  const { datos, error } = leerDatosSeccion(formulario);
  if (!datos) return redirect(`${destino}?error=${error}&tipo=seccion#lista-seccion`, 303);

  await bd.seccionPagina.create({ data: { ...datos, paginaId } });
  return redirect(`${destino}?ok=creado&tipo=seccion#lista-seccion`, 303);
};
