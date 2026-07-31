import type { APIRoute } from "astro";
import { bd } from "../../../../lib/bd";
import { LIMITES_CHIP, leerDatosBloque } from "../../../../lib/bloques";
import { calcularReordenamiento, type Direccion } from "../../../../lib/orden";

export const prerender = false;

const DESTINO = "/admin/chips";
const ORDEN_LISTA = [{ orden: "asc" as const }, { creadoEn: "asc" as const }];

export const POST: APIRoute = async ({ params, request, redirect }) => {
  const id = params.id ?? "";
  const chip = await bd.chipPlataforma.findUnique({ where: { id } });
  if (!chip) return redirect(`${DESTINO}?error=noexiste`, 303);

  const formulario = await request.formData();
  const accion = String(formulario.get("_accion") ?? "");

  if (accion === "eliminar") {
    await bd.chipPlataforma.delete({ where: { id } });
    return redirect(`${DESTINO}?ok=eliminado`, 303);
  }

  if (accion === "activar") {
    await bd.chipPlataforma.update({ where: { id }, data: { activa: !chip.activa } });
    return redirect(`${DESTINO}?ok=${chip.activa ? "oculto" : "visible"}`, 303);
  }

  if (accion === "subir" || accion === "bajar") {
    const lista = await bd.chipPlataforma.findMany({
      orderBy: ORDEN_LISTA,
      select: { id: true, orden: true },
    });
    const nuevos = calcularReordenamiento(lista, id, accion as Direccion);
    if (!nuevos) return redirect(`${DESTINO}?ok=sincambios`, 303);

    await bd.$transaction(
      nuevos.map((fila) =>
        bd.chipPlataforma.update({ where: { id: fila.id }, data: { orden: fila.orden } }),
      ),
    );
    return redirect(`${DESTINO}?ok=reordenado`, 303);
  }

  // Sin `_accion` el formulario es el de edicion; con una desconocida, no.
  if (accion !== "") return redirect(`${DESTINO}?error=accion`, 303);

  const { datos, error } = leerDatosBloque(formulario, LIMITES_CHIP);
  if (!datos) return redirect(`${DESTINO}?error=${error}#elemento-${id}`, 303);

  await bd.chipPlataforma.update({ where: { id }, data: datos });
  return redirect(`${DESTINO}?ok=guardado#elemento-${id}`, 303);
};
