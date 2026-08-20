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

/**
 * Migas de pan para los resultados de busqueda.
 *
 * Google las usa para pintar la ruta («humantouchbooks.pe › Nosotros › Quiénes
 * somos») en vez de la URL cruda, de modo que el resultado dice de un vistazo
 * en que parte del sitio esta la pagina. Es de los pocos datos estructurados
 * que siguen dando un resultado enriquecido real.
 *
 * La posicion arranca en 1 y el ultimo elemento es la pagina actual.
 */
export interface Miga {
  nombre: string;
  /** Ruta absoluta del sitio: "/nosotros/quienes-somos". */
  ruta: string;
}

export function migasDePan(migas: readonly Miga[], base: URL): string {
  return serializarJsonLd({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: migas.map((miga, posicion) => ({
      "@type": "ListItem",
      position: posicion + 1,
      name: miga.nombre,
      item: new URL(miga.ruta, base).href,
    })),
  });
}
