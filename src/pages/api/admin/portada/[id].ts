import type { APIRoute } from "astro";
import { bd } from "../../../../lib/bd";
import { eliminarPortada } from "../../../../lib/almacen";
import { calcularReordenamiento, type Direccion } from "../../../../lib/orden";

export const prerender = false;

const DESTINO = "/admin/portada";
const ORDEN_LISTA = [{ orden: "asc" as const }, { creadoEn: "asc" as const }];

export const POST: APIRoute = async ({ params, request, redirect }) => {
  const id = params.id ?? "";
  const imagen = await bd.imagenHero.findUnique({ where: { id } });
  if (!imagen) return redirect(`${DESTINO}?error=noexiste`, 303);

  const formulario = await request.formData();
  const accion = String(formulario.get("_accion") ?? "");

  if (accion === "eliminar") {
    await bd.imagenHero.delete({ where: { id } });
    // La fila ya no existe: si el borrado en el bucket falla, queda un objeto
    // huerfano (inofensivo, nada lo referencia) y no un error para quien opera.
    try {
      await eliminarPortada(imagen.imagenUrl);
    } catch {
      /* objeto huerfano aceptable */
    }
    return redirect(`${DESTINO}?ok=eliminada`, 303);
  }

  if (accion === "activar") {
    await bd.imagenHero.update({ where: { id }, data: { activa: !imagen.activa } });
    return redirect(`${DESTINO}?ok=${imagen.activa ? "oculta" : "visible"}`, 303);
  }

  if (accion === "subir" || accion === "bajar") {
    const lista = await bd.imagenHero.findMany({
      orderBy: ORDEN_LISTA,
      select: { id: true, orden: true },
    });
    const nuevos = calcularReordenamiento(lista, id, accion as Direccion);
    if (!nuevos) return redirect(`${DESTINO}?ok=sincambios`, 303);

    await bd.$transaction(
      nuevos.map((fila) =>
        bd.imagenHero.update({ where: { id: fila.id }, data: { orden: fila.orden } }),
      ),
    );
    return redirect(`${DESTINO}?ok=reordenada`, 303);
  }

  return redirect(`${DESTINO}?error=accion`, 303);
};
