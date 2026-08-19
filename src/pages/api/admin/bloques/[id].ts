import type { APIRoute } from "astro";
import { bd } from "../../../../lib/bd";
import { LIMITES_BLOQUE, leerDatosBloque } from "../../../../lib/bloques";
import { moverEnLista } from "../../../../lib/orden";
import {
  ErrorCuerpoExcedido,
  leerFormulario,
  respuestaCuerpoExcedido,
  TAMANO_FORMULARIO,
} from "../../../../lib/cuerpo";

export const prerender = false;

const DESTINO = "/admin/bloques";

export const POST: APIRoute = async ({ params, request, redirect }) => {
  const id = params.id ?? "";
  const bloque = await bd.bloqueValor.findUnique({ where: { id } });
  if (!bloque) return redirect(`${DESTINO}?error=noexiste`, 303);

  let formulario: FormData;
  try {
    formulario = await leerFormulario(request, TAMANO_FORMULARIO);
  } catch (fallo) {
    if (fallo instanceof ErrorCuerpoExcedido) return respuestaCuerpoExcedido();
    throw fallo;
  }
  const accion = String(formulario.get("_accion") ?? "");

  if (accion === "eliminar") {
    await bd.bloqueValor.delete({ where: { id } });
    return redirect(`${DESTINO}?ok=eliminado`, 303);
  }

  if (accion === "activar") {
    await bd.bloqueValor.update({ where: { id }, data: { activa: !bloque.activa } });
    return redirect(`${DESTINO}?ok=${bloque.activa ? "oculto" : "visible"}`, 303);
  }

  if (accion === "subir" || accion === "bajar") {
    const movido = await moverEnLista({
      cliente: bd,
      delegado: bd.bloqueValor,
      filtro: {},
      id,
      direccion: accion,
    });
    return redirect(`${DESTINO}?ok=${movido ? "reordenado" : "sincambios"}`, 303);
  }

  // Sin `_accion` el formulario es el de edicion; con una desconocida, no.
  if (accion !== "") return redirect(`${DESTINO}?error=accion`, 303);

  const { datos, error } = leerDatosBloque(formulario, LIMITES_BLOQUE);
  if (!datos) return redirect(`${DESTINO}?error=${error}#elemento-${id}`, 303);

  await bd.bloqueValor.update({ where: { id }, data: datos });
  return redirect(`${DESTINO}?ok=guardado#elemento-${id}`, 303);
};
