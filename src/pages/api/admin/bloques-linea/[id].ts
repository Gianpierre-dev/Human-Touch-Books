import type { APIRoute } from "astro";
import { bd } from "../../../../lib/bd";
import { leerDatosBloqueLinea } from "../../../../lib/bloques-linea";
import { calcularReordenamiento, type Direccion } from "../../../../lib/orden";
import {
  ErrorCuerpoExcedido,
  leerFormulario,
  respuestaCuerpoExcedido,
  TAMANO_FORMULARIO,
} from "../../../../lib/cuerpo";

export const prerender = false;

export const POST: APIRoute = async ({ params, request, redirect }) => {
  const id = params.id ?? "";
  const bloque = await bd.bloqueLinea.findUnique({ where: { id } });
  if (!bloque) return redirect("/admin/lineas?error=noexiste", 303);

  // El reordenamiento y la vuelta a la pantalla se hacen SIEMPRE dentro de la
  // linea y del tipo del bloque: subir un pilar no puede mover un argumento.
  const { lineaId, tipo } = bloque;
  const destino = `/admin/lineas/${lineaId}/bloques`;
  const ancla = `&tipo=${tipo}#lista-${tipo}`;

  let formulario: FormData;
  try {
    formulario = await leerFormulario(request, TAMANO_FORMULARIO);
  } catch (fallo) {
    if (fallo instanceof ErrorCuerpoExcedido) return respuestaCuerpoExcedido();
    throw fallo;
  }
  const accion = String(formulario.get("_accion") ?? "");

  if (accion === "eliminar") {
    await bd.bloqueLinea.delete({ where: { id } });
    return redirect(`${destino}?ok=eliminado${ancla}`, 303);
  }

  if (accion === "activar") {
    await bd.bloqueLinea.update({ where: { id }, data: { activa: !bloque.activa } });
    return redirect(`${destino}?ok=${bloque.activa ? "oculto" : "visible"}${ancla}`, 303);
  }

  if (accion === "subir" || accion === "bajar") {
    const lista = await bd.bloqueLinea.findMany({
      where: { lineaId, tipo },
      orderBy: [{ orden: "asc" }, { creadoEn: "asc" }],
      select: { id: true, orden: true },
    });
    const nuevos = calcularReordenamiento(lista, id, accion as Direccion);
    if (!nuevos) return redirect(`${destino}?ok=sincambios${ancla}`, 303);

    await bd.$transaction(
      nuevos.map((fila) =>
        bd.bloqueLinea.update({ where: { id: fila.id }, data: { orden: fila.orden } }),
      ),
    );
    return redirect(`${destino}?ok=reordenado${ancla}`, 303);
  }

  // Sin `_accion` el formulario es el de edicion; con una desconocida, no.
  if (accion !== "") return redirect(`${destino}?error=accion${ancla}`, 303);

  const { datos, error } = leerDatosBloqueLinea(formulario, tipo);
  if (!datos) return redirect(`${destino}?error=${error}&tipo=${tipo}#elemento-${id}`, 303);

  await bd.bloqueLinea.update({ where: { id }, data: datos });
  return redirect(`${destino}?ok=guardado&tipo=${tipo}#elemento-${id}`, 303);
};
