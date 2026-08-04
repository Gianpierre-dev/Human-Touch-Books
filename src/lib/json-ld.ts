// Serializacion de los bloques JSON-LD de las paginas publicas.
//
// POR QUE UNA FUNCION Y NO INTERPOLAR A MANO
// El JSON se arma SIEMPRE con JSON.stringify sobre un objeto: escribir las
// llaves a mano en la plantilla deja el bloque roto en cuanto un texto del panel
// trae comillas o un salto de linea.
//
// El reemplazo de "<" por su escape unicode es obligatorio: dentro de un
// <script> el navegador corta el elemento en cuanto ve la secuencia "</script>",
// y un texto administrable puede contenerla. "<" es JSON valido y el
// parser lo lee como "<", asi que el dato no se altera.

/** Devuelve el JSON del bloque, seguro para incrustar dentro de un <script>. */
export function serializarJsonLd(datos: unknown): string {
  return JSON.stringify(datos).replace(/</g, "\\u003c");
}
