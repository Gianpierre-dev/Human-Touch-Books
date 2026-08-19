import type { APIRoute } from "astro";
import { bd } from "../../../../lib/bd";
import { leerDatosSeccion } from "../../../../lib/paginas";
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
  const seccion = await bd.seccionPagina.findUnique({ where: { id } });
  if (!seccion) return redirect("/admin/paginas?error=noexiste", 303);

  // El reordenamiento y la vuelta a la pantalla se hacen SIEMPRE dentro de la
  // pagina: subir una seccion no puede mover la de otra pagina.
  const { paginaId } = seccion;
  const destino = `/admin/paginas/${paginaId}/bloques`;
  const ancla = "&tipo=seccion#lista-seccion";

  let formulario: FormData;
  try {
    formulario = await leerFormulario(request, TAMANO_FORMULARIO);
  } catch (fallo) {
    if (fallo instanceof ErrorCuerpoExcedido) return respuestaCuerpoExcedido();
    throw fallo;
  }
  const accion = String(formulario.get("_accion") ?? "");

  if (accion === "eliminar") {
    await bd.seccionPagina.delete({ where: { id } });
    return redirect(`${destino}?ok=eliminado${ancla}`, 303);
  }

  if (accion === "activar") {
    await bd.seccionPagina.update({ where: { id }, data: { activa: !seccion.activa } });
    return redirect(`${destino}?ok=${seccion.activa ? "oculto" : "visible"}${ancla}`, 303);
  }

  if (accion === "subir" || accion === "bajar") {
    const lista = await bd.seccionPagina.findMany({
      where: { paginaId },
      orderBy: [{ orden: "asc" }, { creadoEn: "asc" }],
      select: { id: true, orden: true },
    });
    const nuevos = calcularReordenamiento(lista, id, accion as Direccion);
    if (!nuevos) return redirect(`${destino}?ok=sincambios${ancla}`, 303);

    await bd.$transaction(
      nuevos.map((fila) =>
        bd.seccionPagina.update({ where: { id: fila.id }, data: { orden: fila.orden } }),
      ),
    );
    return redirect(`${destino}?ok=reordenado${ancla}`, 303);
  }

  // Sin `_accion` el formulario es el de edicion; con una desconocida, no.
  if (accion !== "") return redirect(`${destino}?error=accion${ancla}`, 303);

  const { datos, error } = leerDatosSeccion(formulario);
  if (!datos) return redirect(`${destino}?error=${error}&tipo=seccion#elemento-${id}`, 303);

  await bd.seccionPagina.update({ where: { id }, data: datos });
  return redirect(`${destino}?ok=guardado&tipo=seccion#elemento-${id}`, 303);
};
