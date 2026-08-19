import type { APIRoute } from "astro";
import { bd } from "../../../lib/bd";
import {
  ANCHO_IMAGEN_SITIO,
  borrarDelBucket,
  ErrorImagenInvalida,
  esPortadaValida,
  guardarImagen,
} from "../../../lib/almacen";
import { esClaveImagenSitio, LIMITES } from "../../../lib/contenido";
import {
  ErrorCuerpoExcedido,
  leerFormulario,
  TAMANO_FORMULARIO_CON_ARCHIVO,
} from "../../../lib/cuerpo";

export const prerender = false;

const DESTINO = "/admin/imagenes";

export const POST: APIRoute = async ({ request, redirect }) => {
  let formulario: FormData;
  try {
    formulario = await leerFormulario(request, TAMANO_FORMULARIO_CON_ARCHIVO);
  } catch (fallo) {
    if (fallo instanceof ErrorCuerpoExcedido) return redirect(`${DESTINO}?error=tamano`, 303);
    throw fallo;
  }

  const clave = String(formulario.get("clave") ?? "");
  if (!esClaveImagenSitio(clave)) return redirect(`${DESTINO}?error=clave`, 303);

  const actual = await bd.imagenSitio.findUnique({ where: { clave } });

  // Restaurar deja el espacio vacio: la landing vuelve a la imagen del repositorio.
  if (String(formulario.get("_accion") ?? "") === "restaurar") {
    if (!actual) return redirect(`${DESTINO}?ok=sincambios`, 303);
    await bd.imagenSitio.delete({ where: { clave } });
    await borrarDelBucket(actual.imagenUrl);
    return redirect(`${DESTINO}?ok=restaurada`, 303);
  }

  const archivo = formulario.get("imagen");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return redirect(`${DESTINO}?error=sinimagen`, 303);
  }

  const invalida = esPortadaValida(archivo);
  if (invalida) return redirect(`${DESTINO}?error=${encodeURIComponent(invalida)}`, 303);

  const altTexto = String(formulario.get("alt_texto") ?? "").trim();
  if (!altTexto) return redirect(`${DESTINO}?error=sinalt`, 303);
  if (altTexto.length > LIMITES.altTexto) return redirect(`${DESTINO}?error=altlargo`, 303);

  let guardada: Awaited<ReturnType<typeof guardarImagen>>;
  try {
    guardada = await guardarImagen(archivo, clave, { anchoMaximo: ANCHO_IMAGEN_SITIO });
  } catch (fallo) {
    // «procesar» culpa al archivo; «almacen» dice que el fallo es nuestro. La
    // distincion importa: con el mensaje equivocado, quien administra reexporta
    // su foto una y otra vez sin que nada cambie.
    const codigo = fallo instanceof ErrorImagenInvalida ? "procesar" : "almacen";
    return redirect(`${DESTINO}?error=${codigo}`, 303);
  }

  // Las medidas reales viajan a la base para que la landing reserve el espacio
  // exacto de la imagen y no haya salto de maquetado al cargarla.
  const datos = {
    imagenUrl: guardada.url,
    altTexto,
    ancho: guardada.ancho,
    alto: guardada.alto,
  };
  await bd.imagenSitio.upsert({
    where: { clave },
    update: datos,
    create: { clave, ...datos },
  });

  // La imagen anterior del espacio deja de usarse: se borra del bucket.
  if (actual) await borrarDelBucket(actual.imagenUrl);

  return redirect(`${DESTINO}?ok=guardada`, 303);
};
