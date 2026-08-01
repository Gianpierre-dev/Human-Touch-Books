// Lineas de producto del catalogo. El panel las administra desde /admin/lineas y
// cada libro puede pertenecer a una (relacion opcional).
//
// La clave es un slug estable: es el identificador que usaran las URLs publicas
// de cada linea, asi que se valida su forma aqui y su unicidad contra la base.

import { sirveConBlanco } from "./contraste";

export interface DatosLinea {
  clave: string;
  nombre: string;
  etiquetaCorta: string;
  descripcion: string;
  colorHex: string;
  orden: number;
}

/** Codigos de error que la vista traduce a texto. */
export type ErrorLinea =
  | "sinnombre"
  | "nombrelargo"
  | "sinetiqueta"
  | "etiquetalarga"
  | "sinclave"
  | "clavelarga"
  | "claveformato"
  | "claverepetida"
  | "sindescripcion"
  | "descripcionlarga"
  | "color"
  | "colorcontraste"
  | "orden";

/** Limites de los campos (los espejan los `maxlength` del formulario). */
export const LIMITES_LINEA = {
  nombre: 60,
  etiquetaCorta: 30,
  clave: 40,
  descripcion: 400,
} as const;

/** Limites del contenido de la pagina publica de la linea. */
export const LIMITES_CONTENIDO_LINEA = {
  heroAntetitulo: 40,
  heroTitulo: 60,
  heroParrafo: 600,
  heroImagenAlt: 200,
  pilaresTitulo: 80,
  pilaresParrafo: 400,
  coleccionTitulo: 80,
  argumentosTitulo: 80,
  ctaTitulo: 100,
  ctaParrafo: 300,
} as const;

// Slug: minusculas, digitos y guiones internos. Ni empieza ni termina en guion,
// y no admite guiones seguidos: asi la clave se puede usar tal cual en una URL.
const PATRON_CLAVE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Color de identidad en hexadecimal de 6 digitos: es lo que emite el
// `<input type="color">` y lo unico que la web va a inyectar como color.
const PATRON_COLOR = /^#[0-9a-f]{6}$/i;

export function leerDatosLinea(datos: FormData): { datos?: DatosLinea; error?: ErrorLinea } {
  const nombre = String(datos.get("nombre") ?? "").trim();
  if (!nombre) return { error: "sinnombre" };
  if (nombre.length > LIMITES_LINEA.nombre) return { error: "nombrelargo" };

  const etiquetaCorta = String(datos.get("etiqueta_corta") ?? "").trim();
  if (!etiquetaCorta) return { error: "sinetiqueta" };
  if (etiquetaCorta.length > LIMITES_LINEA.etiquetaCorta) return { error: "etiquetalarga" };

  const clave = String(datos.get("clave") ?? "")
    .trim()
    .toLowerCase();
  if (!clave) return { error: "sinclave" };
  if (clave.length > LIMITES_LINEA.clave) return { error: "clavelarga" };
  if (!PATRON_CLAVE.test(clave)) return { error: "claveformato" };

  const descripcion = String(datos.get("descripcion") ?? "").trim();
  if (!descripcion) return { error: "sindescripcion" };
  if (descripcion.length > LIMITES_LINEA.descripcion) return { error: "descripcionlarga" };

  const colorHex = String(datos.get("color_hex") ?? "").trim();
  if (!PATRON_COLOR.test(colorHex)) return { error: "color" };
  // El color de linea se usa como TEXTO sobre fondo claro y como FONDO con
  // texto blanco encima. Sin este corte, un celeste elegido en el panel deja
  // ilegible la pagina entera de esa linea. Ver src/lib/contraste.ts.
  if (!sirveConBlanco(colorHex)) return { error: "colorcontraste" };

  const ordenTexto = String(datos.get("orden") ?? "0").trim();
  const orden = Number.parseInt(ordenTexto === "" ? "0" : ordenTexto, 10);
  // Acotado al rango de un entero de la base: sin tope, un numero enorme pasa
  // esta validacion y revienta recien al escribir.
  if (!Number.isSafeInteger(orden) || orden < 0 || orden > 9999) return { error: "orden" };

  return {
    datos: { clave, nombre, etiquetaCorta, descripcion, colorHex: colorHex.toLowerCase(), orden },
  };
}

// ---------------------------------------------------------------------------
// Contenido de la pagina publica de la linea
// ---------------------------------------------------------------------------
//
// MISMO CRITERIO QUE src/lib/textos.ts: el valor por defecto vive SOLO aqui,
// nunca en la base. El panel muestra el campo VACIO con el defecto como
// `placeholder`, y vaciarlo vuelve a dejar el defecto en la web. Si el defecto
// se sembrara en la base, cualquier retoque del copy en el codigo quedaria
// tapado por una fila vieja para siempre.
//
// Los defectos se derivan de la propia linea (nombre, descripcion), asi que una
// linea recien creada —o HTB Lector, que no tiene contenido cargado— muestra
// una pagina digna sin que nadie escriba nada.

/** Campos de contenido que administra el panel. Todos opcionales en la base. */
export interface ContenidoLinea {
  heroAntetitulo: string | null;
  heroTitulo: string | null;
  heroParrafo: string | null;
  pilaresTitulo: string | null;
  pilaresParrafo: string | null;
  coleccionTitulo: string | null;
  argumentosTitulo: string | null;
  ctaTitulo: string | null;
  ctaParrafo: string | null;
}

/** Identidad de la linea de la que se derivan los defectos. */
export interface IdentidadLinea {
  nombre: string;
  descripcion: string;
}

export interface ContenidoLineaResuelto {
  heroAntetitulo: string;
  heroTitulo: string;
  /** Ya partido en parrafos: el campo admite lineas en blanco como separador. */
  heroParrafos: readonly string[];
  pilaresTitulo: string;
  pilaresParrafo: string;
  coleccionTitulo: string;
  argumentosTitulo: string;
  ctaTitulo: string;
  ctaParrafo: string;
}

/** Defectos de cada campo, derivados de la linea. Los usa la web y el panel. */
export function defectosContenidoLinea(linea: IdentidadLinea): Record<keyof ContenidoLinea, string> {
  // «Colección HTB Lector» ya se llama coleccion: anteponerselo de nuevo daba
  // «Colección Colección HTB Lector».
  const tituloColeccion = /^colecci[óo]n\b/i.test(linea.nombre)
    ? linea.nombre
    : `Colección ${linea.nombre}`;

  return {
    heroAntetitulo: "Proyecto",
    heroTitulo: linea.nombre,
    heroParrafo: linea.descripcion,
    pilaresTitulo: `¿Qué es ${linea.nombre}?`,
    pilaresParrafo: "",
    coleccionTitulo: tituloColeccion,
    argumentosTitulo: `¿Por qué elegir ${linea.nombre}?`,
    ctaTitulo: `¿Deseas implementar ${linea.nombre} en tu institución?`,
    ctaParrafo: "Estamos listos para acompañarte en este gran paso hacia una educación integral.",
  };
}

/** Separa el parrafo del hero en parrafos reales: una linea en blanco los corta. */
export function partirEnParrafos(texto: string): readonly string[] {
  return texto
    .split(/\n\s*\n/)
    .map((parrafo) => parrafo.trim())
    .filter((parrafo) => parrafo !== "");
}

/** Mezcla lo guardado con los defectos. Un campo vacio equivale a no tenerlo. */
export function resolverContenidoLinea(
  linea: IdentidadLinea & ContenidoLinea,
): ContenidoLineaResuelto {
  const defectos = defectosContenidoLinea(linea);
  const usar = (valor: string | null, defecto: string): string => valor?.trim() || defecto;

  return {
    heroAntetitulo: usar(linea.heroAntetitulo, defectos.heroAntetitulo),
    heroTitulo: usar(linea.heroTitulo, defectos.heroTitulo),
    heroParrafos: partirEnParrafos(usar(linea.heroParrafo, defectos.heroParrafo)),
    pilaresTitulo: usar(linea.pilaresTitulo, defectos.pilaresTitulo),
    pilaresParrafo: usar(linea.pilaresParrafo, defectos.pilaresParrafo),
    coleccionTitulo: usar(linea.coleccionTitulo, defectos.coleccionTitulo),
    argumentosTitulo: usar(linea.argumentosTitulo, defectos.argumentosTitulo),
    ctaTitulo: usar(linea.ctaTitulo, defectos.ctaTitulo),
    ctaParrafo: usar(linea.ctaParrafo, defectos.ctaParrafo),
  };
}

export type ErrorContenidoLinea = `${keyof ContenidoLinea}largo`;

/**
 * Lee el formulario de contenido. Ningun campo es obligatorio: el vacio se
 * guarda como `null` y la web vuelve al defecto. Lo unico que se valida es el
 * largo, porque el `maxlength` del navegador se puede saltar.
 */
export function leerContenidoLinea(datos: FormData): {
  datos?: ContenidoLinea;
  error?: ErrorContenidoLinea;
} {
  const campos: { clave: keyof ContenidoLinea; campo: string }[] = [
    { clave: "heroAntetitulo", campo: "hero_antetitulo" },
    { clave: "heroTitulo", campo: "hero_titulo" },
    { clave: "heroParrafo", campo: "hero_parrafo" },
    { clave: "pilaresTitulo", campo: "pilares_titulo" },
    { clave: "pilaresParrafo", campo: "pilares_parrafo" },
    { clave: "coleccionTitulo", campo: "coleccion_titulo" },
    { clave: "argumentosTitulo", campo: "argumentos_titulo" },
    { clave: "ctaTitulo", campo: "cta_titulo" },
    { clave: "ctaParrafo", campo: "cta_parrafo" },
  ];

  // Se parte de un objeto vacio y el bucle lo completa con TODAS las claves,
  // pero TypeScript no puede probarlo durante el llenado.
  const contenido = {} as ContenidoLinea;
  for (const { clave, campo } of campos) {
    // El navegador envia los saltos de un textarea como CRLF (asi lo pide la
    // norma de formularios). Se normalizan a LF antes de guardar: el separador
    // de parrafos del hero es una linea en blanco y conviene que en la base sea
    // siempre el mismo caracter.
    const valor = String(datos.get(campo) ?? "")
      .replace(/\r\n/g, "\n")
      .trim();
    if (valor.length > LIMITES_CONTENIDO_LINEA[clave]) return { error: `${clave}largo` };
    contenido[clave] = valor === "" ? null : valor;
  }
  return { datos: contenido };
}
