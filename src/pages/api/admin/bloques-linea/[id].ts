import type { APIRoute } from "astro";
import { bd } from "../../../../lib/bd";
import { leerDatosBloqueLinea } from "../../../../lib/bloques-linea";
import { moverEnLista } from "../../../../lib/orden";
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
    const movido = await moverEnLista({
      cliente: bd,
      delegado: bd.bloqueLinea,
      filtro: { lineaId, tipo },
      id,
      direccion: accion,
    });
    return redirect(`${destino}?ok=${movido ? "reordenado" : "sincambios"}${ancla}`, 303);
  }

  // Sin `_accion` el formulario es el de edicion; con una desconocida, no.
  if (accion !== "") return redirect(`${destino}?error=accion${ancla}`, 303);

  const { datos, error } = leerDatosBloqueLinea(formulario, tipo);
  if (!datos) return redirect(`${destino}?error=${error}&tipo=${tipo}#elemento-${id}`, 303);

  await bd.bloqueLinea.update({ where: { id }, data: datos });
  return redirect(`${destino}?ok=guardado&tipo=${tipo}#elemento-${id}`, 303);
};
