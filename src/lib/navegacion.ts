// Datos del menu de dos niveles de la cabecera.
//
// POR QUE VIVE AQUI Y NO DENTRO DE Header.astro
// El menu depende de la base (las paginas institucionales y las lineas activas),
// pero Header sigue siendo un componente de presentacion: recibe los grupos ya
// resueltos por props. Consultar dentro del componente lo ataria a Prisma y
// dejaria de poder pintarse sin base.
//
// POR QUE NO SE REPITE LA CONSULTA EN CADA PAGINA
// La consulta esta escrita UNA vez, aqui. Cada pagina publica la usa en una
// linea (`const navegacion = await cargarNavegacion()`), asi que agregar un
// grupo nuevo al menu no obliga a tocar index, /lineas ni /nosotros.
//
// Es UNA sola consulta a la base (tres `findMany` en paralelo) sobre tablas de
// pocas filas y con `select` acotado: no justifica cache ni middleware.
//
// LAS ETIQUETAS DEL MENU Y DEL PIE TAMBIEN SE RESUELVEN AQUI
// «Inicio», «Nosotros», «Explora»… son administrables (/admin/textos, grupo
// «Menú y pie»). Resolverlas aqui y no en cada pagina es lo mismo que ya se hizo
// con los enlaces: la cabecera y el pie estan en las cinco paginas publicas, y
// si cada una tuviera que acordarse de leer esas claves, la sexta pagina que
// alguien agregue mañana se quedaria con las etiquetas por defecto sin que nadie
// lo note. Al viajar dentro de `Navegacion`, la prop que Header y Footer YA
// reciben las trae puestas.

import { bd } from "./bd";
import { defectoFijo, type ClaveTexto, type FilaTexto } from "./textos";

/** Un enlace del segundo nivel del menu. */
export interface EnlaceMenu {
  href: string;
  etiqueta: string;
  /** Color de identidad, solo lo traen las lineas. Pinta el punto del item. */
  color?: string;
}

/**
 * Claves del catalogo de textos que pinta la cabecera o el pie. El `satisfies`
 * las ata al catalogo: una clave mal escrita no compila.
 */
const CLAVES_ETIQUETAS = [
  "nav_inicio",
  "nav_nosotros",
  "nav_textos",
  "nav_contacto",
  "pie_explora",
  "pie_contacto",
  "pie_preguntas",
  // El parrafo del pie viaja aqui por la misma razon que las etiquetas: solo
  // la landing se acordaba de pasarlo y las demas paginas mostraban el texto
  // por defecto aunque el panel lo hubiera editado.
  "pie_descripcion",
] as const satisfies readonly ClaveTexto[];

export type ClaveEtiquetaNavegacion = (typeof CLAVES_ETIQUETAS)[number];

/** Etiquetas ya resueltas: la propia si el panel la guardo, si no la del codigo. */
export type EtiquetasNavegacion = Record<ClaveEtiquetaNavegacion, string>;

function resolverEtiquetas(filas: readonly FilaTexto[]): EtiquetasNavegacion {
  const propias = new Map(filas.map((fila) => [fila.clave, fila.valor]));
  // Se parte de un objeto vacio y el bucle lo completa con TODAS las claves:
  // al terminar cumple el Record, pero TypeScript no puede probarlo mientras
  // se llena. Mismo criterio que `resolverTextos`.
  const etiquetas = {} as EtiquetasNavegacion;
  for (const clave of CLAVES_ETIQUETAS) {
    etiquetas[clave] = propias.get(clave) ?? defectoFijo(clave);
  }
  return etiquetas;
}

/** Etiquetas del codigo, sin tocar la base. Es lo que ve una pagina sin datos. */
export const ETIQUETAS_POR_DEFECTO: EtiquetasNavegacion = resolverEtiquetas([]);

export interface Navegacion {
  /** Paginas institucionales activas, para el desplegable «Nosotros». */
  paginas: readonly EnlaceMenu[];
  /** Lineas activas, para «Nuestros textos educativos». */
  lineas: readonly EnlaceMenu[];
  /** Etiquetas fijas del menu y del pie, administrables desde /admin/textos. */
  etiquetas: EtiquetasNavegacion;
}

/** Menu vacio: los dos desplegables se omiten. Sirve de valor por defecto. */
export const NAVEGACION_VACIA: Navegacion = {
  paginas: [],
  lineas: [],
  etiquetas: ETIQUETAS_POR_DEFECTO,
};

export async function cargarNavegacion(): Promise<Navegacion> {
  const [paginas, lineas, textos] = await Promise.all([
    bd.paginaInstitucional.findMany({
      where: { activa: true },
      orderBy: [{ orden: "asc" }, { creadoEn: "asc" }],
      select: { clave: true, titulo: true },
    }),
    bd.linea.findMany({
      where: { activa: true },
      orderBy: [{ orden: "asc" }, { creadoEn: "asc" }],
      select: { clave: true, nombre: true, colorHex: true },
    }),
    // Solo las filas del menu y el pie: la landing carga el catalogo entero
    // porque lo necesita entero, pero las demas paginas no tienen por que
    // traerse cuarenta textos para pintar siete etiquetas.
    bd.textoSitio.findMany({
      where: { clave: { in: [...CLAVES_ETIQUETAS] } },
      select: { clave: true, valor: true },
    }),
  ]);

  return {
    etiquetas: resolverEtiquetas(textos),
    paginas: paginas.map((pagina) => ({
      href: `/nosotros/${pagina.clave}`,
      etiqueta: pagina.titulo,
    })),
    lineas: lineas.map((linea) => ({
      href: `/lineas/${linea.clave}`,
      etiqueta: linea.nombre,
      color: linea.colorHex,
    })),
  };
}
