import type { APIRoute } from "astro";
import { bd } from "../../../../../lib/bd";
import {
  ANCHO_IMAGEN_SITIO,
  borrarDelBucket,
  ErrorImagenInvalida,
  esPortadaValida,
  guardarImagen,
} from "../../../../../lib/almacen";
import { LIMITE_IMAGEN_ALT } from "../../../../../lib/paginas";

export const prerender = false;

const DESTINO = "/admin/paginas";

// Fotografia del hero de la pagina institucional. Mismo patron que el hero de
// una linea: se guarda optimizada con sus medidas reales (CLS cero) y el objeto
// anterior se borra del bucket recien cuando la base ya no lo referencia.
export const POST: APIRoute = async ({ params, request, redirect }) => {
  const id = params.id ?? "";
  const pagina = await bd.paginaInstitucional.findUnique({
    where: { id },
    select: { id: true, clave: true, imagenUrl: true },
  });
  if (!pagina) return redirect(`${DESTINO}?error=noexiste`, 303);

  const ancla = `#imagen-${id}`;
  const formulario = await request.formData();

  // Quitar la imagen deja la pagina sin foto: el hero se dibuja igual, a una
  // sola columna.
  if (String(formulario.get("_accion") ?? "") === "restaurar") {
    if (!pagina.imagenUrl) return redirect(`${DESTINO}?ok=sincambios${ancla}`, 303);
    await bd.paginaInstitucional.update({
      where: { id },
      data: { imagenUrl: null, imagenAlt: null, ancho: null, alto: null },
    });
    await borrarDelBucket(pagina.imagenUrl);
    return redirect(`${DESTINO}?ok=imagenquitada${ancla}`, 303);
  }

  const archivo = formulario.get("imagen");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return redirect(`${DESTINO}?error=sinimagen${ancla}`, 303);
  }

  const invalida = esPortadaValida(archivo);
  if (invalida) return redirect(`${DESTINO}?error=${encodeURIComponent(invalida)}${ancla}`, 303);

  const altTexto = String(formulario.get("imagen_alt") ?? "").trim();
  if (!altTexto) return redirect(`${DESTINO}?error=sinalt${ancla}`, 303);
  if (altTexto.length > LIMITE_IMAGEN_ALT) {
    return redirect(`${DESTINO}?error=altlargo${ancla}`, 303);
  }

  let guardada: Awaited<ReturnType<typeof guardarImagen>>;
  try {
    guardada = await guardarImagen(archivo, `pagina-${pagina.clave}`, {
      anchoMaximo: ANCHO_IMAGEN_SITIO,
    });
  } catch (fallo) {
    // «procesar» culpa al archivo; «almacen» asume el fallo como nuestro.
    const codigo = fallo instanceof ErrorImagenInvalida ? "procesar" : "almacen";
    return redirect(`${DESTINO}?error=${codigo}${ancla}`, 303);
  }

  await bd.paginaInstitucional.update({
    where: { id },
    data: {
      imagenUrl: guardada.url,
      imagenAlt: altTexto,
      ancho: guardada.ancho,
      alto: guardada.alto,
    },
  });

  if (pagina.imagenUrl) await borrarDelBucket(pagina.imagenUrl);

  return redirect(`${DESTINO}?ok=imagenguardada${ancla}`, 303);
};
