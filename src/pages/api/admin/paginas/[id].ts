import type { APIRoute } from "astro";
import { Prisma } from "@prisma/client";
import { bd } from "../../../../lib/bd";
import { calcularReordenamiento, type Direccion } from "../../../../lib/orden";
import { leerDatosPagina } from "../../../../lib/paginas";
import {
  ErrorCuerpoExcedido,
  leerFormulario,
  respuestaCuerpoExcedido,
  TAMANO_FORMULARIO,
} from "../../../../lib/cuerpo";

export const prerender = false;

const DESTINO = "/admin/paginas";
const ORDEN_LISTA = [{ orden: "asc" as const }, { creadoEn: "asc" as const }];

export const POST: APIRoute = async ({ params, request, redirect }) => {
  const id = params.id ?? "";
  const pagina = await bd.paginaInstitucional.findUnique({ where: { id } });
  if (!pagina) return redirect(`${DESTINO}?error=noexiste`, 303);

  let formulario: FormData;
  try {
    formulario = await leerFormulario(request, TAMANO_FORMULARIO);
  } catch (fallo) {
    if (fallo instanceof ErrorCuerpoExcedido) return respuestaCuerpoExcedido();
    throw fallo;
  }
  const accion = String(formulario.get("_accion") ?? "");

  if (accion === "eliminar") {
    // Las secciones y los valores se borran con la pagina (`Cascade`): no son
    // contenido reutilizable, solo tienen sentido dentro de ella.
    await bd.paginaInstitucional.delete({ where: { id } });
    return redirect(`${DESTINO}?ok=eliminada`, 303);
  }

  if (accion === "activar") {
    await bd.paginaInstitucional.update({ where: { id }, data: { activa: !pagina.activa } });
    return redirect(`${DESTINO}?ok=${pagina.activa ? "oculta" : "visible"}`, 303);
  }

  if (accion === "subir" || accion === "bajar") {
    const lista = await bd.paginaInstitucional.findMany({
      orderBy: ORDEN_LISTA,
      select: { id: true, orden: true },
    });
    const nuevos = calcularReordenamiento(lista, id, accion as Direccion);
    if (!nuevos) return redirect(`${DESTINO}?ok=sincambios`, 303);

    await bd.$transaction(
      nuevos.map((fila) =>
        bd.paginaInstitucional.update({ where: { id: fila.id }, data: { orden: fila.orden } }),
      ),
    );
    return redirect(`${DESTINO}?ok=reordenada`, 303);
  }

  // Sin `_accion` el formulario es el de edicion; con una desconocida, no.
  if (accion !== "") return redirect(`${DESTINO}?error=accion`, 303);

  const { datos, error } = leerDatosPagina(formulario);
  if (!datos) return redirect(`${DESTINO}?error=${error}#pagina-${id}`, 303);

  if (datos.clave !== pagina.clave) {
    const repetida = await bd.paginaInstitucional.findUnique({ where: { clave: datos.clave } });
    if (repetida) return redirect(`${DESTINO}?error=claverepetida#pagina-${id}`, 303);
  }

  try {
    await bd.paginaInstitucional.update({ where: { id }, data: datos });
  } catch (fallo) {
    // Igual que en el alta: solo el choque contra el indice unico se traduce a
    // "clave repetida"; el resto de los fallos no se disfrazan.
    if (fallo instanceof Prisma.PrismaClientKnownRequestError && fallo.code === "P2002") {
      return redirect(`${DESTINO}?error=claverepetida#pagina-${id}`, 303);
    }
    throw fallo;
  }
  return redirect(`${DESTINO}?ok=guardada#pagina-${id}`, 303);
};
