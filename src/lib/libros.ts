import { esPortadaValida, guardarPortada } from "./almacen";
import { bd } from "./bd";

/** Limite de la frase breve que acompana al libro en la pagina de su linea. */
export const LIMITE_DESCRIPCION_CORTA = 160;

export interface DatosLibro {
  titulo: string;
  subtitulo: string | null;
  // La linea es la UNICA fuente de verdad de la clasificacion del libro: de
  // ella salen la pagina publica en la que aparece y la seccion de la portada
  // (su `tipo` decide entre Coleccion escolar y Plan Lector). Por eso es
  // obligatoria: un libro sin linea no se podria mostrar en ningun sitio.
  lineaId: string;
  descripcionCorta: string | null;
  grado: string | null;
  nivel: string | null;
  autor: string | null;
  ilustrador: string | null;
  anio: number | null;
  sinopsis: string;
  orden: number;
  destacado: boolean;
}

function textoONulo(datos: FormData, clave: string): string | null {
  const valor = String(datos.get(clave) ?? "").trim();
  return valor === "" ? null : valor;
}

export function leerDatosLibro(datos: FormData): { datos?: DatosLibro; error?: string } {
  const titulo = String(datos.get("titulo") ?? "").trim();
  const sinopsis = String(datos.get("sinopsis") ?? "").trim();
  const lineaId = String(datos.get("linea_id") ?? "").trim();

  if (!titulo) return { error: "El título es obligatorio." };
  if (!sinopsis) return { error: "La sinopsis es obligatoria." };
  // El `required` del navegador se puede saltar enviando el formulario a mano.
  if (!lineaId) return { error: "Selecciona la línea a la que pertenece el libro." };

  const anioTexto = textoONulo(datos, "anio");
  const anio = anioTexto === null ? null : Number.parseInt(anioTexto, 10);
  if (anio !== null && Number.isNaN(anio)) return { error: "El año no es válido." };

  const ordenTexto = String(datos.get("orden") ?? "0").trim();
  const orden = Number.parseInt(ordenTexto === "" ? "0" : ordenTexto, 10);
  if (Number.isNaN(orden)) return { error: "El orden debe ser un número." };

  // El `maxlength` del navegador se puede saltar: el limite se comprueba aqui.
  const descripcionCorta = textoONulo(datos, "descripcion_corta");
  if (descripcionCorta !== null && descripcionCorta.length > LIMITE_DESCRIPCION_CORTA) {
    return { error: `La descripción breve admite hasta ${LIMITE_DESCRIPCION_CORTA} caracteres.` };
  }

  return {
    datos: {
      titulo,
      subtitulo: textoONulo(datos, "subtitulo"),
      lineaId,
      descripcionCorta,
      grado: textoONulo(datos, "grado"),
      nivel: textoONulo(datos, "nivel"),
      autor: textoONulo(datos, "autor"),
      ilustrador: textoONulo(datos, "ilustrador"),
      anio,
      sinopsis,
      orden,
      destacado: datos.get("destacado") === "si",
    },
  };
}

/**
 * Comprueba que la linea elegida exista. El `<select>` solo ofrece lineas
 * reales, pero el formulario se puede enviar a mano y sin esta comprobacion la
 * clave foranea reventaria con un error 500 en vez de un mensaje entendible.
 * Devuelve el texto del error o `null` si todo esta bien.
 */
export async function verificarLinea(lineaId: string): Promise<string | null> {
  const existentes = await bd.linea.count({ where: { id: lineaId } });
  return existentes === 0 ? "La línea seleccionada ya no existe." : null;
}

export async function procesarPortada(
  datos: FormData,
  titulo: string,
): Promise<{ url?: string; error?: string }> {
  const archivo = datos.get("portada");
  if (!(archivo instanceof File) || archivo.size === 0) return {};
  const invalida = esPortadaValida(archivo);
  if (invalida) return { error: invalida };
  try {
    return { url: await guardarPortada(archivo, titulo) };
  } catch {
    // sharp lanza si el archivo no es una imagen real, aunque la extension lo parezca
    return { error: "No pudimos procesar la imagen. Verifica que sea un JPG, PNG o WebP válido." };
  }
}
