import type { APIRoute } from "astro";
import { bd } from "../../../../lib/bd";
import { leerDatosLibro, procesarPortada, verificarLinea } from "../../../../lib/libros";
import {
  ErrorCuerpoExcedido,
  leerFormulario,
  TAMANO_FORMULARIO_CON_ARCHIVO,
} from "../../../../lib/cuerpo";
import { guardarBorrador } from "../../../../lib/borrador";

export const prerender = false;

const DESTINO = "/admin/libros/nuevo";
// La cookie cubre /admin/libros entero, asi que el borrador lleva de que ficha
// es: sin `id`, solo repuebla el formulario de alta.
const COOKIE_BORRADOR = "borrador_libros";
const RUTA_BORRADOR = "/admin/libros";

export const POST: APIRoute = async ({ request, redirect, cookies }) => {
  let formulario: FormData;
  try {
    formulario = await leerFormulario(request, TAMANO_FORMULARIO_CON_ARCHIVO);
  } catch (fallo) {
    if (fallo instanceof ErrorCuerpoExcedido) return redirect(`${DESTINO}?error=tamano`, 303);
    throw fallo;
  }

  // Un alta rechazada devolvia el formulario EN BLANCO: doce campos escritos a
  // mano y una portada seleccionada, perdidos por un archivo demasiado pesado.
  // El archivo no se puede devolver (el navegador no lo permite) y la pantalla
  // lo advierte; el resto vuelve tal como se escribio.
  const rechazar = (mensaje: string) => {
    guardarBorrador({ cookies, nombre: COOKIE_BORRADOR, ruta: RUTA_BORRADOR }, formulario);
    return redirect(`${DESTINO}?error=${encodeURIComponent(mensaje)}`, 303);
  };

  const { datos, error } = leerDatosLibro(formulario);
  if (!datos) return rechazar(error ?? "");

  const errorLinea = await verificarLinea(datos.lineaId);
  if (errorLinea) return rechazar(errorLinea);

  const portada = await procesarPortada(formulario, datos.titulo);
  if (portada.error) return rechazar(portada.error);
  if (!portada.url) return rechazar("La portada es obligatoria.");

  await bd.libro.create({ data: { ...datos, portadaUrl: portada.url } });
  return redirect("/admin?ok=creado", 303);
};
