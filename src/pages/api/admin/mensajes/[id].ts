import type { APIRoute } from "astro";
import { bd } from "../../../../lib/bd";
import {
  ErrorCuerpoExcedido,
  leerFormulario,
  respuestaCuerpoExcedido,
  TAMANO_FORMULARIO,
} from "../../../../lib/cuerpo";

export const prerender = false;

const DESTINO = "/admin/mensajes";

/** Vuelve a la pagina desde la que se pulso, no siempre a la primera. */
function anclaPagina(formulario: FormData): string {
  const pagina = Number(formulario.get("pagina") ?? "1");
  return Number.isSafeInteger(pagina) && pagina > 1 ? `&pagina=${pagina}` : "";
}

export const POST: APIRoute = async ({ params, request, redirect }) => {
  const id = params.id ?? "";

  let formulario: FormData;
  try {
    formulario = await leerFormulario(request, TAMANO_FORMULARIO);
  } catch (fallo) {
    if (fallo instanceof ErrorCuerpoExcedido) return respuestaCuerpoExcedido();
    throw fallo;
  }

  const mensaje = await bd.mensaje.findUnique({ where: { id } });
  if (!mensaje) return redirect(`${DESTINO}?error=noexiste`, 303);

  await bd.mensaje.update({ where: { id }, data: { atendido: !mensaje.atendido } });
  return redirect(`${DESTINO}?ok=actualizado${anclaPagina(formulario)}`, 303);
};
