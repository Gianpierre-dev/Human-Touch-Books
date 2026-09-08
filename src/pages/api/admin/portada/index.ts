import type { APIRoute } from "astro";
import { bd } from "../../../../lib/bd";
import {
  ANCHO_IMAGEN_HERO,
  ErrorImagenInvalida,
  esPortadaValida,
  guardarImagen,
} from "../../../../lib/almacen";
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
  } catch (fallo) {
    // «procesar» culpa al archivo (sharp no pudo leerlo); «almacen» dice que el
    // fallo es nuestro (el bucket). La distincion importa mas ahora que cada
    // subida son hasta cinco objetos: con el mensaje equivocado, quien
    // administra reexporta su foto una y otra vez sin que nada cambie.
    const codigo = fallo instanceof ErrorImagenInvalida ? "procesar" : "almacen";
    return redirect(`${DESTINO}?error=${codigo}`, 303);
  }

  // Las medidas reales viajan a la base con la URL: el ANCHO es lo que le
  // permite a la portada ofrecer las variantes ya generadas (src/lib/imagenes.ts)
  // en vez de mandarle el hero completo a un celular.
  await bd.imagenHero.create({
    data: {
      imagenUrl: guardada.url,
      altTexto,
      orden,
      ancho: guardada.ancho,
      alto: guardada.alto,
    },
  });
  return redirect(`${DESTINO}?ok=creada`, 303);
};
