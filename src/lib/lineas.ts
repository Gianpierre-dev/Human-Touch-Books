// Lineas de producto del catalogo. El panel las administra desde /admin/lineas y
// cada libro puede pertenecer a una (relacion opcional).
//
// La clave es un slug estable: es el identificador que usaran las URLs publicas
// de cada linea, asi que se valida su forma aqui y su unicidad contra la base.

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
  | "orden";

/** Limites de los campos (los espejan los `maxlength` del formulario). */
export const LIMITES_LINEA = {
  nombre: 60,
  etiquetaCorta: 30,
  clave: 40,
  descripcion: 400,
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

  const ordenTexto = String(datos.get("orden") ?? "0").trim();
  const orden = Number.parseInt(ordenTexto === "" ? "0" : ordenTexto, 10);
  // Acotado al rango de un entero de la base: sin tope, un numero enorme pasa
  // esta validacion y revienta recien al escribir.
  if (!Number.isSafeInteger(orden) || orden < 0 || orden > 9999) return { error: "orden" };

  return {
    datos: { clave, nombre, etiquetaCorta, descripcion, colorHex: colorHex.toLowerCase(), orden },
  };
}
