import type { APIRoute } from "astro";
import { bd } from "../../../../lib/bd";
import { borrarDelBucket } from "../../../../lib/almacen";
import { moverEnLista } from "../../../../lib/orden";
import {
  ErrorCuerpoExcedido,
  leerFormulario,
  respuestaCuerpoExcedido,
  TAMANO_FORMULARIO,
} from "../../../../lib/cuerpo";

export const prerender = false;

const DESTINO = "/admin/portada";

export const POST: APIRoute = async ({ params, request, redirect }) => {
  const id = params.id ?? "";
  const imagen = await bd.imagenHero.findUnique({ where: { id } });
  if (!imagen) return redirect(`${DESTINO}?error=noexiste`, 303);

  let formulario: FormData;
  try {
    formulario = await leerFormulario(request, TAMANO_FORMULARIO);
  } catch (fallo) {
    if (fallo instanceof ErrorCuerpoExcedido) return respuestaCuerpoExcedido();
    throw fallo;
  }
  const accion = String(formulario.get("_accion") ?? "");

  if (accion === "eliminar") {
    await bd.imagenHero.delete({ where: { id } });
    // La fila ya no existe: si el borrado en el bucket falla, queda un objeto
    // huerfano (inofensivo, nada lo referencia) y no un error para quien opera.
    await borrarDelBucket(imagen.imagenUrl);
    return redirect(`${DESTINO}?ok=eliminada`, 303);
  }

  if (accion === "activar") {
    await bd.imagenHero.update({ where: { id }, data: { activa: !imagen.activa } });
    return redirect(`${DESTINO}?ok=${imagen.activa ? "oculta" : "visible"}`, 303);
  }

  if (accion === "subir" || accion === "bajar") {
    const movida = await moverEnLista({
      cliente: bd,
      delegado: bd.imagenHero,
      filtro: {},
      id,
      direccion: accion,
    });
    return redirect(`${DESTINO}?ok=${movida ? "reordenada" : "sincambios"}`, 303);
  }

  return redirect(`${DESTINO}?error=accion`, 303);
};
