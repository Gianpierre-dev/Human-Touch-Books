import type { APIRoute } from "astro";
import { bd } from "../../../../lib/bd";
import {
  ANCHO_IMAGEN_HERO_MOVIL,
  borrarDelBucket,
  ErrorImagenInvalida,
  esPortadaValida,
  guardarImagen,
} from "../../../../lib/almacen";
import { moverEnLista } from "../../../../lib/orden";
import {
  ErrorCuerpoExcedido,
  leerFormulario,
  TAMANO_FORMULARIO_CON_ARCHIVO,
} from "../../../../lib/cuerpo";

export const prerender = false;

const DESTINO = "/admin/portada";

export const POST: APIRoute = async ({ params, request, redirect }) => {
  const id = params.id ?? "";
  const imagen = await bd.imagenHero.findUnique({ where: { id } });
  if (!imagen) return redirect(`${DESTINO}?error=noexiste`, 303);

  // Un solo tope para todas las acciones, el de formularios CON archivo: una de
  // ellas sube la version para celular. Subir el tope no abre nada: el endpoint
  // esta detras de sesion y la imagen se sigue validando aparte a 5 MB.
  let formulario: FormData;
  try {
    formulario = await leerFormulario(request, TAMANO_FORMULARIO_CON_ARCHIVO);
  } catch (fallo) {
    if (fallo instanceof ErrorCuerpoExcedido) return redirect(`${DESTINO}?error=tamano`, 303);
    throw fallo;
  }
  const accion = String(formulario.get("_accion") ?? "");

  if (accion === "eliminar") {
    await bd.imagenHero.delete({ where: { id } });
    // La fila ya no existe: si el borrado en el bucket falla, queda un objeto
    // huerfano (inofensivo, nada lo referencia) y no un error para quien opera.
    // Se borran las DOS imagenes: la de celular solo existia para esta fila.
    await borrarDelBucket(imagen.imagenUrl);
    await borrarDelBucket(imagen.imagenMovilUrl);
    return redirect(`${DESTINO}?ok=eliminada`, 303);
  }

  if (accion === "activar") {
    await bd.imagenHero.update({ where: { id }, data: { activa: !imagen.activa } });
    return redirect(`${DESTINO}?ok=${imagen.activa ? "oculta" : "visible"}`, 303);
  }

  if (accion === "movil") {
    const archivo = formulario.get("imagen_movil");
    if (!(archivo instanceof File) || archivo.size === 0) {
      return redirect(`${DESTINO}?error=sinimagenmovil`, 303);
    }

    // `esPortadaValida` ya devuelve un texto listo para la persona usuaria; la
    // vista lo muestra tal cual cuando no coincide con ningun codigo conocido.
    const invalida = esPortadaValida(archivo);
    if (invalida) return redirect(`${DESTINO}?error=${encodeURIComponent(invalida)}`, 303);

    let guardada: Awaited<ReturnType<typeof guardarImagen>>;
    try {
      guardada = await guardarImagen(archivo, "hero-movil", {
        anchoMaximo: ANCHO_IMAGEN_HERO_MOVIL,
      });
    } catch (fallo) {
      // «procesar» culpa al archivo (sharp no pudo leerlo); «almacen» dice que
      // el fallo es nuestro (el bucket). Con el mensaje equivocado, quien
      // administra reexporta su foto una y otra vez sin que nada cambie.
      const codigo = fallo instanceof ErrorImagenInvalida ? "procesar" : "almacen";
      return redirect(`${DESTINO}?error=${codigo}`, 303);
    }

    await bd.imagenHero.update({
      where: { id },
      data: {
        imagenMovilUrl: guardada.url,
        movilAncho: guardada.ancho,
        movilAlto: guardada.alto,
      },
    });

    // La anterior se borra DESPUES de que la fila apunte a la nueva: al reves,
    // un fallo entre medias dejaria a la portada pidiendo un archivo borrado.
    await borrarDelBucket(imagen.imagenMovilUrl);
    return redirect(`${DESTINO}?ok=movil`, 303);
  }

  if (accion === "quitar_movil") {
    if (!imagen.imagenMovilUrl) return redirect(`${DESTINO}?ok=sincambios`, 303);
    await bd.imagenHero.update({
      where: { id },
      data: { imagenMovilUrl: null, movilAncho: null, movilAlto: null },
    });
    await borrarDelBucket(imagen.imagenMovilUrl);
    return redirect(`${DESTINO}?ok=movilquitada`, 303);
  }

  if (accion === "subir" || accion === "bajar") {
    const movida = await moverEnLista({
      cliente: bd,
      delegado: bd.imagenHero,
      filtro: {},
      id,
      direccion: accion,
    });
    return redirect(`${DESTINO}?ok=${movida ? "reordenada" : "sincambios"}`, 303);
  }

  return redirect(`${DESTINO}?error=accion`, 303);
};
