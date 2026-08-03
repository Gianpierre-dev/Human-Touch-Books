import type { APIRoute } from "astro";
import { bd } from "../../../../lib/bd";
import { leerDatosValor } from "../../../../lib/paginas";

export const prerender = false;

// Alta de una tarjeta de valor. La pagina viaja como campo oculto del
// formulario porque el alta no tiene id propio todavia.
export const POST: APIRoute = async ({ request, redirect }) => {
  const formulario = await request.formData();

  const paginaId = String(formulario.get("pagina_id") ?? "");
  const pagina = await bd.paginaInstitucional.findUnique({
    where: { id: paginaId },
    select: { id: true },
  });
  if (!pagina) return redirect("/admin/paginas?error=noexiste", 303);

  const destino = `/admin/paginas/${paginaId}/bloques`;

  const { datos, error } = leerDatosValor(formulario);
  if (!datos) return redirect(`${destino}?error=${error}&tipo=valor#lista-valor`, 303);

  await bd.bloquePagina.create({ data: { ...datos, paginaId } });
  return redirect(`${destino}?ok=creado&tipo=valor#lista-valor`, 303);
};
