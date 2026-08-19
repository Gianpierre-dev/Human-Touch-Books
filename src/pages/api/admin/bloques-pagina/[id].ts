import type { APIRoute } from "astro";
import { bd } from "../../../../lib/bd";
import { leerDatosValor } from "../../../../lib/paginas";
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
  const valor = await bd.bloquePagina.findUnique({ where: { id } });
  if (!valor) return redirect("/admin/paginas?error=noexiste", 303);

  // El reordenamiento y la vuelta a la pantalla se hacen SIEMPRE dentro de la
  // pagina: subir un valor no puede mover el de otra pagina.
  const { paginaId } = valor;
  const destino = `/admin/paginas/${paginaId}/bloques`;
  const ancla = "&tipo=valor#lista-valor";

  let formulario: FormData;
  try {
    formulario = await leerFormulario(request, TAMANO_FORMULARIO);
  } catch (fallo) {
    if (fallo instanceof ErrorCuerpoExcedido) return respuestaCuerpoExcedido();
    throw fallo;
  }
  const accion = String(formulario.get("_accion") ?? "");

  if (accion === "eliminar") {
    await bd.bloquePagina.delete({ where: { id } });
    return redirect(`${destino}?ok=eliminado${ancla}`, 303);
  }

  if (accion === "activar") {
    await bd.bloquePagina.update({ where: { id }, data: { activa: !valor.activa } });
    return redirect(`${destino}?ok=${valor.activa ? "oculto" : "visible"}${ancla}`, 303);
  }

  if (accion === "subir" || accion === "bajar") {
    const movido = await moverEnLista({
      cliente: bd,
      delegado: bd.bloquePagina,
      filtro: { paginaId },
      id,
      direccion: accion,
    });
    return redirect(`${destino}?ok=${movido ? "reordenado" : "sincambios"}${ancla}`, 303);
  }

  // Sin `_accion` el formulario es el de edicion; con una desconocida, no.
  if (accion !== "") return redirect(`${destino}?error=accion${ancla}`, 303);

  const { datos, error } = leerDatosValor(formulario);
  if (!datos) return redirect(`${destino}?error=${error}&tipo=valor#elemento-${id}`, 303);

  await bd.bloquePagina.update({ where: { id }, data: datos });
  return redirect(`${destino}?ok=guardado&tipo=valor#elemento-${id}`, 303);
};
