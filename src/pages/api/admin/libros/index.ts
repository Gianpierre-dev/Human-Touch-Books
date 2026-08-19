import type { APIRoute } from "astro";
import { bd } from "../../../../lib/bd";
import { leerDatosLibro, procesarPortada, verificarLinea } from "../../../../lib/libros";
import {
  ErrorCuerpoExcedido,
  leerFormulario,
  TAMANO_FORMULARIO_CON_ARCHIVO,
} from "../../../../lib/cuerpo";

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  let formulario: FormData;
  try {
    formulario = await leerFormulario(request, TAMANO_FORMULARIO_CON_ARCHIVO);
  } catch (fallo) {
    if (fallo instanceof ErrorCuerpoExcedido)
      return redirect("/admin/libros/nuevo?error=tamano", 303);
    throw fallo;
  }
  const { datos, error } = leerDatosLibro(formulario);
  if (!datos) {
    return redirect(`/admin/libros/nuevo?error=${encodeURIComponent(error ?? "")}`, 303);
  }

  const errorLinea = await verificarLinea(datos.lineaId);
  if (errorLinea) {
    return redirect(`/admin/libros/nuevo?error=${encodeURIComponent(errorLinea)}`, 303);
  }

  const portada = await procesarPortada(formulario, datos.titulo);
  if (portada.error) {
    return redirect(`/admin/libros/nuevo?error=${encodeURIComponent(portada.error)}`, 303);
  }
  if (!portada.url) {
    return redirect(
      `/admin/libros/nuevo?error=${encodeURIComponent("La portada es obligatoria.")}`,
      303,
    );
  }

  await bd.libro.create({ data: { ...datos, portadaUrl: portada.url } });
  return redirect("/admin?ok=creado", 303);
};
