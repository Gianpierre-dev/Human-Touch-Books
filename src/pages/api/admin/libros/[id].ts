import type { APIRoute } from "astro";
import { bd } from "../../../../lib/bd";
// `borrarDelBucket` y no `eliminarPortada` a secas: la fila ya se guardo o se
// borro cuando esto corre, asi que un fallo del bucket dejaria a quien opera
// viendo un 500 sobre un cambio que SI se hizo (y al reintentar, «no existe»).
import { borrarDelBucket } from "../../../../lib/almacen";
import { leerDatosLibro, procesarPortada, verificarLinea } from "../../../../lib/libros";
import { calcularReordenamiento, type Direccion } from "../../../../lib/orden";

export const prerender = false;

const ORDEN_LISTA = [{ orden: "asc" as const }, { creadoEn: "asc" as const }];

export const POST: APIRoute = async ({ params, request, redirect }) => {
  const id = params.id ?? "";
  const libro = await bd.libro.findUnique({ where: { id } });
  if (!libro) return redirect("/admin?error=noexiste", 303);

  const formulario = await request.formData();
  const accion = String(formulario.get("_accion") ?? "");

  if (accion === "eliminar") {
    await bd.libro.delete({ where: { id } });
    await borrarDelBucket(libro.portadaUrl);
    return redirect("/admin?ok=eliminado", 303);
  }

  if (accion === "subir" || accion === "bajar") {
    // El orden de un libro solo tiene sentido DENTRO de su linea: es como lo
    // recorre la pagina de la coleccion. Un libro huerfano no se muestra en
    // ningun sitio, asi que tampoco hay una lista en la que moverlo.
    if (!libro.lineaId) return redirect("/admin?error=sinlinea", 303);

    const lista = await bd.libro.findMany({
      where: { lineaId: libro.lineaId },
      orderBy: ORDEN_LISTA,
      select: { id: true, orden: true },
    });
    // Renumera la linea entera de forma consecutiva: si dos libros comparten
    // el mismo `orden` (pasa con el valor que trae el formulario por defecto),
    // intercambiar solo los dos valores no moveria nada.
    const nuevos = calcularReordenamiento(lista, id, accion as Direccion);
    if (!nuevos) return redirect("/admin?ok=sincambios", 303);

    await bd.$transaction(
      nuevos.map((fila) =>
        bd.libro.update({ where: { id: fila.id }, data: { orden: fila.orden } }),
      ),
    );
    return redirect("/admin?ok=reordenado", 303);
  }

  const { datos, error } = leerDatosLibro(formulario);
  if (!datos) {
    return redirect(`/admin/libros/${id}?error=${encodeURIComponent(error ?? "")}`, 303);
  }

  const errorLinea = await verificarLinea(datos.lineaId);
  if (errorLinea) {
    return redirect(`/admin/libros/${id}?error=${encodeURIComponent(errorLinea)}`, 303);
  }

  const portada = await procesarPortada(formulario, datos.titulo);
  if (portada.error) {
    return redirect(`/admin/libros/${id}?error=${encodeURIComponent(portada.error)}`, 303);
  }

  await bd.libro.update({
    where: { id },
    data: { ...datos, ...(portada.url ? { portadaUrl: portada.url } : {}) },
  });
  if (portada.url) {
    await borrarDelBucket(libro.portadaUrl);
  }
  return redirect("/admin?ok=guardado", 303);
};
