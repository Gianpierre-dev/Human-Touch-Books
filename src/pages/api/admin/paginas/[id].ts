import type { APIRoute } from "astro";
import { Prisma } from "@prisma/client";
import { bd } from "../../../../lib/bd";
import { moverEnLista } from "../../../../lib/orden";
import { leerDatosPagina } from "../../../../lib/paginas";
import {
  ErrorCuerpoExcedido,
  leerFormulario,
  respuestaCuerpoExcedido,
  TAMANO_FORMULARIO,
} from "../../../../lib/cuerpo";
import { guardarBorrador } from "../../../../lib/borrador";

export const prerender = false;

const DESTINO = "/admin/paginas";

// Un envio rechazado no puede perder lo escrito. Los valores vuelven en una
// COOKIE de un solo uso y no en la query por dos razones: los textos de esta
// pantalla superan el millar de caracteres, de modo que la direccion pasaria a
// medir miles, y quedarian en la barra de direcciones, en el historial y en los
// registros del servidor. La pantalla la lee y la borra en el mismo render.
const COOKIE_BORRADOR = "borrador_paginas";

export const POST: APIRoute = async ({ params, request, redirect, cookies }) => {
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
    const movida = await moverEnLista({
      cliente: bd,
      delegado: bd.paginaInstitucional,
      filtro: {},
      id,
      direccion: accion,
    });
    return redirect(`${DESTINO}?ok=${movida ? "reordenada" : "sincambios"}`, 303);
  }

  // Sin `_accion` el formulario es el de edicion; con una desconocida, no.
  if (accion !== "") return redirect(`${DESTINO}?error=accion`, 303);

  // El navegador NUNCA envia el fragmento al servidor, asi que el elemento
  // tambien viaja como parametro: es lo unico que le permite a la pantalla
  // pintar el aviso dentro de esta tarjeta y no a varias pantallas de distancia.
  const fila = `&foco=pagina-${id}#pagina-${id}`;

  const { datos, error } = leerDatosPagina(formulario);
  if (!datos) {
    guardarBorrador({ cookies, nombre: COOKIE_BORRADOR, ruta: DESTINO, id: id }, formulario);
    return redirect(`${DESTINO}?error=${error}${fila}`, 303);
  }

  if (datos.clave !== pagina.clave) {
    const repetida = await bd.paginaInstitucional.findUnique({ where: { clave: datos.clave } });
    if (repetida) {
      guardarBorrador({ cookies, nombre: COOKIE_BORRADOR, ruta: DESTINO, id: id }, formulario);
      return redirect(`${DESTINO}?error=claverepetida${fila}`, 303);
    }
  }

  try {
    await bd.paginaInstitucional.update({ where: { id }, data: datos });
  } catch (fallo) {
    // Igual que en el alta: solo el choque contra el indice unico se traduce a
    // "clave repetida"; el resto de los fallos no se disfrazan.
    if (fallo instanceof Prisma.PrismaClientKnownRequestError && fallo.code === "P2002") {
      guardarBorrador({ cookies, nombre: COOKIE_BORRADOR, ruta: DESTINO, id: id }, formulario);
      return redirect(`${DESTINO}?error=claverepetida${fila}`, 303);
    }
    throw fallo;
  }
  return redirect(`${DESTINO}?ok=guardada${fila}`, 303);
};
