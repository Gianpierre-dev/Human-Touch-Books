import type { APIRoute } from "astro";
import { Prisma } from "@prisma/client";
import { bd } from "../../../../lib/bd";
import { calcularReordenamiento, type Direccion } from "../../../../lib/orden";
import { leerDatosLinea } from "../../../../lib/lineas";

export const prerender = false;

const DESTINO = "/admin/lineas";
const ORDEN_LISTA = [{ orden: "asc" as const }, { creadoEn: "asc" as const }];

export const POST: APIRoute = async ({ params, request, redirect }) => {
  const id = params.id ?? "";
  const linea = await bd.linea.findUnique({ where: { id } });
  if (!linea) return redirect(`${DESTINO}?error=noexiste`, 303);

  const formulario = await request.formData();
  const accion = String(formulario.get("_accion") ?? "");

  if (accion === "eliminar") {
    // Los libros de la linea no se borran: la relacion es `onDelete: SetNull`,
    // asi que quedan en el catalogo sin linea asignada.
    await bd.linea.delete({ where: { id } });
    return redirect(`${DESTINO}?ok=eliminada`, 303);
  }

  if (accion === "activar") {
    await bd.linea.update({ where: { id }, data: { activa: !linea.activa } });
    return redirect(`${DESTINO}?ok=${linea.activa ? "oculta" : "visible"}`, 303);
  }

  if (accion === "subir" || accion === "bajar") {
    const lista = await bd.linea.findMany({
      orderBy: ORDEN_LISTA,
      select: { id: true, orden: true },
    });
    const nuevos = calcularReordenamiento(lista, id, accion as Direccion);
    if (!nuevos) return redirect(`${DESTINO}?ok=sincambios`, 303);

    await bd.$transaction(
      nuevos.map((fila) => bd.linea.update({ where: { id: fila.id }, data: { orden: fila.orden } })),
    );
    return redirect(`${DESTINO}?ok=reordenada`, 303);
  }

  // Sin `_accion` el formulario es el de edicion; con una desconocida, no.
  if (accion !== "") return redirect(`${DESTINO}?error=accion`, 303);

  const { datos, error } = leerDatosLinea(formulario);
  if (!datos) return redirect(`${DESTINO}?error=${error}#linea-${id}`, 303);

  if (datos.clave !== linea.clave) {
    const repetida = await bd.linea.findUnique({ where: { clave: datos.clave } });
    if (repetida) return redirect(`${DESTINO}?error=claverepetida#linea-${id}`, 303);
  }

  try {
    await bd.linea.update({ where: { id }, data: datos });
  } catch (fallo) {
    // Igual que en el alta: solo el choque contra el indice unico se traduce a
    // "clave repetida"; el resto de los fallos no se disfrazan.
    if (fallo instanceof Prisma.PrismaClientKnownRequestError && fallo.code === "P2002") {
      return redirect(`${DESTINO}?error=claverepetida#linea-${id}`, 303);
    }
    throw fallo;
  }
  return redirect(`${DESTINO}?ok=guardada#linea-${id}`, 303);
};
