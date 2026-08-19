import type { APIRoute } from "astro";
import { bd } from "../../../../lib/bd";
import { LIMITES_CHIP, leerDatosBloque } from "../../../../lib/bloques";
import { moverEnLista } from "../../../../lib/orden";
import {
  ErrorCuerpoExcedido,
  leerFormulario,
  respuestaCuerpoExcedido,
  TAMANO_FORMULARIO,
} from "../../../../lib/cuerpo";

export const prerender = false;

const DESTINO = "/admin/chips";

export const POST: APIRoute = async ({ params, request, redirect }) => {
  const id = params.id ?? "";
  const chip = await bd.chipPlataforma.findUnique({ where: { id } });
  if (!chip) return redirect(`${DESTINO}?error=noexiste`, 303);

  let formulario: FormData;
  try {
    formulario = await leerFormulario(request, TAMANO_FORMULARIO);
  } catch (fallo) {
    if (fallo instanceof ErrorCuerpoExcedido) return respuestaCuerpoExcedido();
    throw fallo;
  }
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
    const movido = await moverEnLista({
      cliente: bd,
      delegado: bd.chipPlataforma,
      filtro: {},
      id,
      direccion: accion,
    });
    return redirect(`${DESTINO}?ok=${movido ? "reordenado" : "sincambios"}`, 303);
  }

  // Sin `_accion` el formulario es el de edicion; con una desconocida, no.
  if (accion !== "") return redirect(`${DESTINO}?error=accion`, 303);

  const { datos, error } = leerDatosBloque(formulario, LIMITES_CHIP);
  if (!datos) return redirect(`${DESTINO}?error=${error}#elemento-${id}`, 303);

  await bd.chipPlataforma.update({ where: { id }, data: datos });
  return redirect(`${DESTINO}?ok=guardado#elemento-${id}`, 303);
};
