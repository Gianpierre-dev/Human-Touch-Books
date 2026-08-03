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
// Es UNA sola consulta a la base (dos `findMany` en paralelo) sobre tablas de
// pocas filas y con `select` acotado: no justifica cache ni middleware.

import { bd } from "./bd";

/** Un enlace del segundo nivel del menu. */
export interface EnlaceMenu {
  href: string;
  etiqueta: string;
  /** Color de identidad, solo lo traen las lineas. Pinta el punto del item. */
  color?: string;
}

export interface Navegacion {
  /** Paginas institucionales activas, para el desplegable «Nosotros». */
  paginas: readonly EnlaceMenu[];
  /** Lineas activas, para «Nuestros textos educativos». */
  lineas: readonly EnlaceMenu[];
}

/** Menu vacio: los dos desplegables se omiten. Sirve de valor por defecto. */
export const NAVEGACION_VACIA: Navegacion = { paginas: [], lineas: [] };

export async function cargarNavegacion(): Promise<Navegacion> {
  const [paginas, lineas] = await Promise.all([
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
  ]);

  return {
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
