import type { LineaLibro } from "@prisma/client";
import { esPortadaValida, guardarPortada } from "./almacen";

export interface DatosLibro {
  titulo: string;
  subtitulo: string | null;
  linea: LineaLibro;
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
  const linea = String(datos.get("linea") ?? "");

  if (!titulo) return { error: "El título es obligatorio." };
  if (!sinopsis) return { error: "La sinopsis es obligatoria." };
  if (linea !== "escolar" && linea !== "literatura") {
    return { error: "Selecciona una línea válida." };
  }

  const anioTexto = textoONulo(datos, "anio");
  const anio = anioTexto === null ? null : Number.parseInt(anioTexto, 10);
  if (anio !== null && Number.isNaN(anio)) return { error: "El año no es válido." };

  const ordenTexto = String(datos.get("orden") ?? "0").trim();
  const orden = Number.parseInt(ordenTexto === "" ? "0" : ordenTexto, 10);
  if (Number.isNaN(orden)) return { error: "El orden debe ser un número." };

  return {
    datos: {
      titulo,
      subtitulo: textoONulo(datos, "subtitulo"),
      linea,
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

export async function procesarPortada(
  datos: FormData,
  titulo: string,
): Promise<{ url?: string; error?: string }> {
  const archivo = datos.get("portada");
  if (!(archivo instanceof File) || archivo.size === 0) return {};
  const invalida = esPortadaValida(archivo);
  if (invalida) return { error: invalida };
  return { url: await guardarPortada(archivo, titulo) };
}
