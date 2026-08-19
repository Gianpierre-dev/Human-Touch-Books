import type { APIRoute } from "astro";
import { bd } from "../../../../lib/bd";
import { calcularReordenamiento, type Direccion } from "../../../../lib/orden";
import { leerDatosPregunta } from "../../../../lib/preguntas";
import {
  ErrorCuerpoExcedido,
  leerFormulario,
  respuestaCuerpoExcedido,
  TAMANO_FORMULARIO,
} from "../../../../lib/cuerpo";

export const prerender = false;

const DESTINO = "/admin/preguntas";
const ORDEN_LISTA = [{ orden: "asc" as const }, { creadoEn: "asc" as const }];

export const POST: APIRoute = async ({ params, request, redirect }) => {
  const id = params.id ?? "";
  const pregunta = await bd.pregunta.findUnique({ where: { id } });
  if (!pregunta) return redirect(`${DESTINO}?error=noexiste`, 303);

  let formulario: FormData;
  try {
    formulario = await leerFormulario(request, TAMANO_FORMULARIO);
  } catch (fallo) {
    if (fallo instanceof ErrorCuerpoExcedido) return respuestaCuerpoExcedido();
    throw fallo;
  }
  const accion = String(formulario.get("_accion") ?? "");

  if (accion === "eliminar") {
    await bd.pregunta.delete({ where: { id } });
    return redirect(`${DESTINO}?ok=eliminada`, 303);
  }

  if (accion === "activar") {
    await bd.pregunta.update({ where: { id }, data: { activa: !pregunta.activa } });
    return redirect(`${DESTINO}?ok=${pregunta.activa ? "oculta" : "visible"}`, 303);
  }

  if (accion === "subir" || accion === "bajar") {
    const lista = await bd.pregunta.findMany({
      orderBy: ORDEN_LISTA,
      select: { id: true, orden: true },
    });
    const nuevos = calcularReordenamiento(lista, id, accion as Direccion);
    if (!nuevos) return redirect(`${DESTINO}?ok=sincambios`, 303);

    await bd.$transaction(
      nuevos.map((fila) =>
        bd.pregunta.update({ where: { id: fila.id }, data: { orden: fila.orden } }),
      ),
    );
    return redirect(`${DESTINO}?ok=reordenada`, 303);
  }

  // Sin `_accion` el formulario es el de edicion; con una desconocida, no.
  if (accion !== "") return redirect(`${DESTINO}?error=accion`, 303);

  const { datos, error } = leerDatosPregunta(formulario);
  if (!datos) return redirect(`${DESTINO}?error=${error}#pregunta-${id}`, 303);

  await bd.pregunta.update({ where: { id }, data: datos });
  return redirect(`${DESTINO}?ok=guardada#pregunta-${id}`, 303);
};
