import type { APIRoute } from "astro";
import { bd } from "../../../../lib/bd";
import { eliminarPortada } from "../../../../lib/almacen";
import { leerDatosLibro, procesarPortada, verificarLinea } from "../../../../lib/libros";

export const prerender = false;

export const POST: APIRoute = async ({ params, request, redirect }) => {
  const id = params.id ?? "";
  const libro = await bd.libro.findUnique({ where: { id } });
  if (!libro) return redirect("/admin?error=noexiste", 303);

  const formulario = await request.formData();

  if (formulario.get("_accion") === "eliminar") {
    await bd.libro.delete({ where: { id } });
    await eliminarPortada(libro.portadaUrl);
    return redirect("/admin?ok=eliminado", 303);
  }

  const { datos, error } = leerDatosLibro(formulario);
  if (!datos) {
    return redirect(`/admin/libros/${id}?error=${encodeURIComponent(error ?? "")}`, 303);
  }

  const errorLinea = await verificarLinea(datos.lineaId);
  if (errorLinea) {
    return redirect(`/admin/libros/${id}?error=${encodeURIComponent(errorLinea)}`, 303);
  }

  const portada = await procesarPortada(formulario, datos.titulo);
  if (portada.error) {
    return redirect(`/admin/libros/${id}?error=${encodeURIComponent(portada.error)}`, 303);
  }

  await bd.libro.update({
    where: { id },
    data: { ...datos, ...(portada.url ? { portadaUrl: portada.url } : {}) },
  });
  if (portada.url) {
    await eliminarPortada(libro.portadaUrl);
  }
  return redirect("/admin?ok=guardado", 303);
};
