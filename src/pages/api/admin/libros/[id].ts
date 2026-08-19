import type { APIRoute } from "astro";
import { bd } from "../../../../lib/bd";
// `borrarDelBucket` y no `eliminarPortada` a secas: la fila ya se guardo o se
// borro cuando esto corre, asi que un fallo del bucket dejaria a quien opera
// viendo un 500 sobre un cambio que SI se hizo (y al reintentar, «no existe»).
import { borrarDelBucket } from "../../../../lib/almacen";
import { leerDatosLibro, procesarPortada, verificarLinea } from "../../../../lib/libros";
import { moverEnLista } from "../../../../lib/orden";
import { guardarBorrador } from "../../../../lib/borrador";
import {
  ErrorCuerpoExcedido,
  leerFormulario,
  TAMANO_FORMULARIO_CON_ARCHIVO,
} from "../../../../lib/cuerpo";

export const prerender = false;

// La cookie cubre /admin/libros entero, asi que el borrador lleva de que ficha
// es: el de otro libro (o el de un alta) no puede repoblar esta.
const COOKIE_BORRADOR = "borrador_libros";
const RUTA_BORRADOR = "/admin/libros";

export const POST: APIRoute = async ({ params, request, redirect, cookies }) => {
  const id = params.id ?? "";
  const libro = await bd.libro.findUnique({ where: { id } });
  if (!libro) return redirect("/admin?error=noexiste", 303);

  let formulario: FormData;
  try {
    formulario = await leerFormulario(request, TAMANO_FORMULARIO_CON_ARCHIVO);
  } catch (fallo) {
    if (fallo instanceof ErrorCuerpoExcedido) return redirect("/admin?error=tamano", 303);
    throw fallo;
  }
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

    const movido = await moverEnLista({
      cliente: bd,
      delegado: bd.libro,
      filtro: { lineaId: libro.lineaId },
      id,
      direccion: accion,
    });
    return redirect(`/admin?ok=${movido ? "reordenado" : "sincambios"}`, 303);
  }

  // Una edicion rechazada repintaba la ficha desde la base y se llevaba por
  // delante todo lo que se acababa de escribir. El borrador lleva el id para
  // que no pueda repoblar la ficha de otro libro.
  const rechazar = (mensaje: string) => {
    guardarBorrador({ cookies, nombre: COOKIE_BORRADOR, ruta: RUTA_BORRADOR, id }, formulario);
    return redirect(`/admin/libros/${id}?error=${encodeURIComponent(mensaje)}`, 303);
  };

  const { datos, error } = leerDatosLibro(formulario);
  if (!datos) return rechazar(error ?? "");

  const errorLinea = await verificarLinea(datos.lineaId);
  if (errorLinea) return rechazar(errorLinea);

  const portada = await procesarPortada(formulario, datos.titulo);
  if (portada.error) return rechazar(portada.error);

  await bd.libro.update({
    where: { id },
    data: { ...datos, ...(portada.url ? { portadaUrl: portada.url } : {}) },
  });
  if (portada.url) {
    await borrarDelBucket(libro.portadaUrl);
  }
  return redirect("/admin?ok=guardado", 303);
};
