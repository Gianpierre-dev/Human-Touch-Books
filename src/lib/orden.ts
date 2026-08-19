// El campo `orden` de las listas administrables: como se lee del formulario y
// como se recalcula al mover un elemento.
//
// Intercambiar solo el campo `orden` con el vecino falla cuando dos filas
// comparten el mismo valor (pasa apenas se cargan dos elementos con el orden que
// trae el formulario por defecto). Por eso se mueve la posicion dentro de la
// lista ya ordenada y se renumera todo de forma consecutiva: el resultado es
// siempre estable, sin empates.

/** Tope del campo `orden`: lo espejan los `min`/`max` de los formularios. */
export const ORDEN_MINIMO = 0;
export const ORDEN_MAXIMO = 9999;

/**
 * Lee un entero acotado al rango util. `null` si no es valido.
 *
 * El acotado NO es cosmetico: `orden` y `anio` son `Int` en la base (tope
 * 2.147.483.647). Sin techo, un numero enorme pasa la validacion y revienta
 * recien al escribir, con un 500 que nadie maneja.
 */
export function leerEnteroAcotado(valor: string, minimo: number, maximo: number): number | null {
  const numero = Number.parseInt(valor.trim(), 10);
  if (!Number.isSafeInteger(numero) || numero < minimo || numero > maximo) return null;
  return numero;
}

/** Orden de una lista administrable. Ausente o vacio equivale a 0. */
export function leerOrden(datos: FormData): number | null {
  const texto = String(datos.get("orden") ?? "").trim();
  return leerEnteroAcotado(texto === "" ? "0" : texto, ORDEN_MINIMO, ORDEN_MAXIMO);
}

export interface Ordenable {
  id: string;
  orden: number;
}

export type Direccion = "subir" | "bajar";

export interface NuevoOrden {
  id: string;
  orden: number;
}

/**
 * Mueve el elemento una posicion en la lista (que debe venir ya ordenada) y
 * devuelve el orden consecutivo resultante. Devuelve `null` si el elemento no
 * existe o si ya esta en el extremo: en ese caso no hay nada que escribir.
 */
export function calcularReordenamiento(
  lista: readonly Ordenable[],
  id: string,
  direccion: Direccion,
): NuevoOrden[] | null {
  const indice = lista.findIndex((elemento) => elemento.id === id);
  if (indice === -1) return null;

  const destino = direccion === "subir" ? indice - 1 : indice + 1;
  if (destino < 0 || destino >= lista.length) return null;

  const copia = [...lista];
  const movido = copia[indice];
  if (!movido) return null;
  copia.splice(indice, 1);
  copia.splice(destino, 0, movido);

  return copia.map((elemento, posicion) => ({ id: elemento.id, orden: posicion + 1 }));
}
