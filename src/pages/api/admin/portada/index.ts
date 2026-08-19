import type { APIRoute } from "astro";
import { bd } from "../../../../lib/bd";
import { ANCHO_IMAGEN_HERO, esPortadaValida, guardarImagen } from "../../../../lib/almacen";
import { LIMITES } from "../../../../lib/contenido";
import {
  ErrorCuerpoExcedido,
  leerFormulario,
  TAMANO_FORMULARIO_CON_ARCHIVO,
} from "../../../../lib/cuerpo";

export const prerender = false;

const DESTINO = "/admin/portada";

export const POST: APIRoute = async ({ request, redirect }) => {
  let formulario: FormData;
  try {
    formulario = await leerFormulario(request, TAMANO_FORMULARIO_CON_ARCHIVO);
  } catch (fallo) {
    if (fallo instanceof ErrorCuerpoExcedido) return redirect(`${DESTINO}?error=tamano`, 303);
    throw fallo;
  }

  const archivo = formulario.get("imagen");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return redirect(`${DESTINO}?error=sinimagen`, 303);
  }

  // `esPortadaValida` ya devuelve un texto listo para la persona usuaria; la
  // vista lo muestra tal cual cuando no coincide con ningun codigo conocido.
  const invalida = esPortadaValida(archivo);
  if (invalida) return redirect(`${DESTINO}?error=${encodeURIComponent(invalida)}`, 303);

  const altTexto = String(formulario.get("alt_texto") ?? "").trim();
  if (!altTexto) return redirect(`${DESTINO}?error=sinalt`, 303);
  if (altTexto.length > LIMITES.altTexto) return redirect(`${DESTINO}?error=altlargo`, 303);

  const ordenTexto = String(formulario.get("orden") ?? "0").trim();
  const orden = Number.parseInt(ordenTexto === "" ? "0" : ordenTexto, 10);
  if (Number.isNaN(orden)) return redirect(`${DESTINO}?error=orden`, 303);

  let guardada: Awaited<ReturnType<typeof guardarImagen>>;
  try {
    guardada = await guardarImagen(archivo, "hero", { anchoMaximo: ANCHO_IMAGEN_HERO });
  } catch {
    // sharp lanza si el archivo no es una imagen real, aunque la extension lo parezca
    return redirect(`${DESTINO}?error=procesar`, 303);
  }

  await bd.imagenHero.create({ data: { imagenUrl: guardada.url, altTexto, orden } });
  return redirect(`${DESTINO}?ok=creada`, 303);
};
