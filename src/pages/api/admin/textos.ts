import type { APIRoute } from "astro";
import { bd } from "../../../lib/bd";
import { CAMPOS_TEXTO, GRUPOS_TEXTO } from "../../../lib/textos";
import {
  ErrorCuerpoExcedido,
  leerFormulario,
  respuestaCuerpoExcedido,
  TAMANO_FORMULARIO,
} from "../../../lib/cuerpo";

export const prerender = false;

const DESTINO = "/admin/textos";

const IDS_GRUPO = new Set<string>(GRUPOS_TEXTO.map((grupo) => grupo.id));

/** Ancla del grupo que se estaba editando, para volver a el tras el redirect. */
function anclaGrupo(formulario: FormData): string {
  const grupo = String(formulario.get("_grupo") ?? "");
  return IDS_GRUPO.has(grupo) ? `#grupo-${grupo}` : "";
}

export const POST: APIRoute = async ({ request, redirect }) => {
  let formulario: FormData;
  try {
    formulario = await leerFormulario(request, TAMANO_FORMULARIO);
  } catch (fallo) {
    if (fallo instanceof ErrorCuerpoExcedido) return respuestaCuerpoExcedido();
    throw fallo;
  }
  const ancla = anclaGrupo(formulario);

  // Solo se miran las claves del catalogo: cualquier campo inventado que llegue
  // en el formulario se ignora, nunca crea una fila.
  const enviados = CAMPOS_TEXTO.filter((campo) => formulario.has(campo.clave));

  // Primero se valida TODO y recien despues se escribe: un campo demasiado
  // largo no puede dejar el resto del grupo guardado a medias.
  for (const campo of enviados) {
    const valor = String(formulario.get(campo.clave) ?? "").trim();
    if (valor.length > campo.limite) {
      // Vuelve al mismo grupo: con mas de diez secciones, aterrizar arriba
      // obliga a buscar a mano el campo que fallo.
      return redirect(
        `${DESTINO}?error=largo&campo=${encodeURIComponent(campo.clave)}${ancla}`,
        303,
      );
    }
  }

  // Las escrituras van en UNA transaccion, no en un bucle de esperas sueltas.
  // La validacion de arriba ya evitaba guardar medio grupo por un campo
  // invalido, pero si la conexion se caia en el campo 5 de 9 quedaban cuatro
  // textos nuevos y cinco viejos conviviendo en la pagina, y quien administra
  // recibia un error sin saber que mitad se habia guardado. De paso, pasa de N
  // viajes a la base a uno solo.
  const operaciones = enviados.map((campo) => {
    const clave = campo.clave;
    const valor = String(formulario.get(clave) ?? "").trim();
    // Vaciar el campo borra la fila: asi la web vuelve al texto por defecto del
    // codigo, que es justamente lo que el placeholder anuncia.
    return valor === ""
      ? bd.textoSitio.deleteMany({ where: { clave } })
      : bd.textoSitio.upsert({ where: { clave }, update: { valor }, create: { clave, valor } });
  });
  if (operaciones.length > 0) await bd.$transaction(operaciones);

  if (enviados.length === 0) return redirect(`${DESTINO}?ok=sincambios${ancla}`, 303);
  return redirect(`${DESTINO}?ok=guardado${ancla}`, 303);
};
