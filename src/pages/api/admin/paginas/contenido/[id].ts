import type { APIRoute } from "astro";
import { bd } from "../../../../../lib/bd";
import { leerContenidoPagina } from "../../../../../lib/paginas";
import {
  ErrorCuerpoExcedido,
  leerFormulario,
  respuestaCuerpoExcedido,
  TAMANO_FORMULARIO,
} from "../../../../../lib/cuerpo";
import { guardarBorrador } from "../../../../../lib/borrador";

export const prerender = false;

const DESTINO = "/admin/paginas";

// Un envio rechazado no puede perder lo escrito. Los valores vuelven en una
// COOKIE de un solo uso y no en la query: solo los parrafos admiten 1200
// caracteres, de modo que la direccion pasaria a medir miles y esos textos
// quedarian en la barra de direcciones, en el historial y en los registros del
// servidor. La pantalla la lee y la borra en el mismo render.
const COOKIE_BORRADOR = "borrador_paginas";

// Textos de la pagina publica. Ninguno es obligatorio: el vacio se guarda como
// `null` y la seccion correspondiente simplemente no se dibuja.
export const POST: APIRoute = async ({ params, request, redirect, cookies }) => {
  const id = params.id ?? "";
  const pagina = await bd.paginaInstitucional.findUnique({ where: { id }, select: { id: true } });
  if (!pagina) return redirect(`${DESTINO}?error=noexiste`, 303);

  let formulario: FormData;
  try {
    formulario = await leerFormulario(request, TAMANO_FORMULARIO);
  } catch (fallo) {
    if (fallo instanceof ErrorCuerpoExcedido) return respuestaCuerpoExcedido();
    throw fallo;
  }
  // El fragmento apunta a la TARJETA, que es donde la pantalla pinta el aviso;
  // el parametro dice que la zona tocada es el desplegable de contenido, para
  // que vuelva abierto. El navegador nunca envia el fragmento al servidor: sin
  // este parametro la pantalla no tendria forma de saber ninguna de las dos.
  const fila = `&foco=contenido-${id}#pagina-${id}`;

  const { datos, error } = leerContenidoPagina(formulario);
  if (!datos) {
    guardarBorrador({ cookies, nombre: COOKIE_BORRADOR, ruta: DESTINO, id: id }, formulario);
    return redirect(`${DESTINO}?error=${error}${fila}`, 303);
  }

  await bd.paginaInstitucional.update({ where: { id }, data: datos });
  return redirect(`${DESTINO}?ok=contenido${fila}`, 303);
};
