import type { APIRoute } from "astro";
import { bd } from "../../../../../lib/bd";
import {
  ANCHO_IMAGEN_SITIO,
  eliminarPortada,
  esPortadaValida,
  guardarImagen,
} from "../../../../../lib/almacen";
import { LIMITES_CONTENIDO_LINEA } from "../../../../../lib/lineas";

export const prerender = false;

const DESTINO = "/admin/lineas";

// Fotografia del hero de la linea. Mismo patron que /api/admin/imagenes: se
// guarda optimizada con sus medidas reales (CLS cero) y el objeto anterior se
// borra del bucket recien cuando la base ya no lo referencia.
export const POST: APIRoute = async ({ params, request, redirect }) => {
  const id = params.id ?? "";
  const linea = await bd.linea.findUnique({
    where: { id },
    select: { id: true, clave: true, heroImagenUrl: true },
  });
  if (!linea) return redirect(`${DESTINO}?error=noexiste`, 303);

  const ancla = `#hero-${id}`;
  const formulario = await request.formData();

  // Restaurar deja la linea sin foto: el hero se dibuja igual, a una columna.
  if (String(formulario.get("_accion") ?? "") === "restaurar") {
    if (!linea.heroImagenUrl) return redirect(`${DESTINO}?ok=sincambios${ancla}`, 303);
    await bd.linea.update({
      where: { id },
      data: { heroImagenUrl: null, heroImagenAlt: null, heroAncho: null, heroAlto: null },
    });
    await borrarDelBucket(linea.heroImagenUrl);
    return redirect(`${DESTINO}?ok=heroquitada${ancla}`, 303);
  }

  const archivo = formulario.get("imagen");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return redirect(`${DESTINO}?error=sinimagen${ancla}`, 303);
  }

  const invalida = esPortadaValida(archivo);
  if (invalida) return redirect(`${DESTINO}?error=${encodeURIComponent(invalida)}${ancla}`, 303);

  const altTexto = String(formulario.get("hero_imagen_alt") ?? "").trim();
  if (!altTexto) return redirect(`${DESTINO}?error=sinalt${ancla}`, 303);
  if (altTexto.length > LIMITES_CONTENIDO_LINEA.heroImagenAlt) {
    return redirect(`${DESTINO}?error=altlargo${ancla}`, 303);
  }

  let guardada: Awaited<ReturnType<typeof guardarImagen>>;
  try {
    guardada = await guardarImagen(archivo, `linea-${linea.clave}-hero`, {
      anchoMaximo: ANCHO_IMAGEN_SITIO,
    });
  } catch {
    // sharp lanza si el archivo no es una imagen real, aunque la extension lo parezca
    return redirect(`${DESTINO}?error=procesar${ancla}`, 303);
  }

  await bd.linea.update({
    where: { id },
    data: {
      heroImagenUrl: guardada.url,
      heroImagenAlt: altTexto,
      heroAncho: guardada.ancho,
      heroAlto: guardada.alto,
    },
  });

  if (linea.heroImagenUrl) await borrarDelBucket(linea.heroImagenUrl);

  return redirect(`${DESTINO}?ok=heroguardada${ancla}`, 303);
};

/**
 * Borra el objeto anterior una vez que la base ya no lo referencia. Si el bucket
 * falla queda un objeto huerfano (inofensivo) en vez de un error para quien
 * opera. `eliminarPortada` ya ignora por si sola las rutas del repositorio.
 */
async function borrarDelBucket(url: string): Promise<void> {
  try {
    await eliminarPortada(url);
  } catch {
    /* objeto huerfano aceptable */
  }
}
