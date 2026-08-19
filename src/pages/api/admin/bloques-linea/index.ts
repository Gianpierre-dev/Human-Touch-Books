import type { APIRoute } from "astro";
import { bd } from "../../../../lib/bd";
import { esTipoBloqueLinea, leerDatosBloqueLinea } from "../../../../lib/bloques-linea";
import {
  ErrorCuerpoExcedido,
  leerFormulario,
  respuestaCuerpoExcedido,
  TAMANO_FORMULARIO,
} from "../../../../lib/cuerpo";

export const prerender = false;

// Alta de un pilar o de un argumento. La linea y el tipo viajan como campos
// ocultos del formulario porque el alta no tiene id propio todavia.
export const POST: APIRoute = async ({ request, redirect }) => {
  let formulario: FormData;
  try {
    formulario = await leerFormulario(request, TAMANO_FORMULARIO);
  } catch (fallo) {
    if (fallo instanceof ErrorCuerpoExcedido) return respuestaCuerpoExcedido();
    throw fallo;
  }

  const lineaId = String(formulario.get("linea_id") ?? "");
  const linea = await bd.linea.findUnique({ where: { id: lineaId }, select: { id: true } });
  if (!linea) return redirect("/admin/lineas?error=noexiste", 303);

  const destino = `/admin/lineas/${lineaId}/bloques`;

  const tipo = String(formulario.get("tipo") ?? "");
  if (!esTipoBloqueLinea(tipo)) return redirect(`${destino}?error=tipo`, 303);

  const { datos, error } = leerDatosBloqueLinea(formulario, tipo);
  if (!datos) return redirect(`${destino}?error=${error}&tipo=${tipo}`, 303);

  await bd.bloqueLinea.create({ data: { ...datos, tipo, lineaId } });
  return redirect(`${destino}?ok=creado&tipo=${tipo}#lista-${tipo}`, 303);
};
