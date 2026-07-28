// Reordenamiento de listas administrables (imágenes del hero, preguntas).
//
// Intercambiar solo el campo `orden` con el vecino falla cuando dos filas
// comparten el mismo valor (pasa apenas se cargan dos elementos con el orden que
// trae el formulario por defecto). Por eso se mueve la posicion dentro de la
// lista ya ordenada y se renumera todo de forma consecutiva: el resultado es
// siempre estable, sin empates.

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
