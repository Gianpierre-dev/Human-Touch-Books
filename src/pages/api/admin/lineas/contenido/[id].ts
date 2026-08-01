import type { APIRoute } from "astro";
import { bd } from "../../../../../lib/bd";
import { leerContenidoLinea } from "../../../../../lib/lineas";

export const prerender = false;

const DESTINO = "/admin/lineas";

// Textos de la pagina publica de la linea. Van en su propio endpoint y no en el
// de la linea porque son otro formulario: guardar el copy no deberia obligar a
// revalidar clave, color y demas campos de identidad.
export const POST: APIRoute = async ({ params, request, redirect }) => {
  const id = params.id ?? "";
  const linea = await bd.linea.findUnique({ where: { id }, select: { id: true } });
  if (!linea) return redirect(`${DESTINO}?error=noexiste`, 303);

  const formulario = await request.formData();
  const { datos, error } = leerContenidoLinea(formulario);
  if (!datos) return redirect(`${DESTINO}?error=${error}#contenido-${id}`, 303);

  // Un campo vacio se guarda como `null`: la web vuelve al texto por defecto.
  await bd.linea.update({ where: { id }, data: datos });
  return redirect(`${DESTINO}?ok=contenido#contenido-${id}`, 303);
};
