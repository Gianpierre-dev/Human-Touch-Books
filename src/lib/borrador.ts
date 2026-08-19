// Borrador de un formulario rechazado.
//
// EL PROBLEMA
// El panel valida en el servidor y responde con una redireccion, asi que la
// pantalla se repinta desde la base y todo lo que la persona acababa de
// escribir se pierde. En el alta de un libro son doce campos y una portada; en
// una linea, cuatro cambios que se esfuman porque la clave choco con otra.
//
// POR QUE UNA COOKIE Y NO LA QUERY
// Los textos largos (una sinopsis, una descripcion de 400 caracteres) harian
// que la direccion midiera miles de caracteres, y quedarian a la vista en la
// barra del navegador, en el historial y en los registros del servidor.
//
// DE UN SOLO USO
// La pantalla la lee y la borra en el MISMO render. Si sobreviviera, pisaria el
// formulario la proxima vez que se entrara limpio a esa pantalla.
//
// NUNCA GUARDA CONTRASENAS: `CAMPOS_EXCLUIDOS` las descarta siempre, aunque
// quien llame se olvide de excluirlas.
import type { AstroCookies } from "astro";

const VIDA_SEGUNDOS = 60; // solo tiene que sobrevivir a la redireccion
/** Margen bajo el limite de ~4 KB por cookie que aplican los navegadores. */
const TOPE_BYTES = 3500;

/**
 * Campos que jamas viajan en un borrador. La accion no es un dato del
 * formulario, y una contrasena no se guarda ni por un minuto ni cifrada por el
 * navegador: si el borrador se escribiera con ella dentro, quedaria en el disco
 * de quien administra.
 */
const CAMPOS_EXCLUIDOS = new Set(["_accion", "clave", "clave_actual", "clave_nueva", "contrasena"]);

export interface OpcionesBorrador {
  cookies: AstroCookies;
  /** Nombre de la cookie. Uno por pantalla, para que no se pisen entre si. */
  nombre: string;
  /** Ruta a la que se acota la cookie: no viaja al resto del panel. */
  ruta: string;
  /**
   * Id de la fila que se estaba editando, o `null` en un alta. La pantalla
   * comprueba que coincida: el borrador de otra ficha no puede repoblar esta.
   */
  id?: string | null;
}

/** Guarda los campos de texto del formulario para repoblar la pantalla. */
export function guardarBorrador(
  { cookies, nombre, ruta, id = null }: OpcionesBorrador,
  formulario: FormData,
): void {
  const campos: Record<string, string> = {};
  for (const [clave, valor] of formulario.entries()) {
    if (typeof valor !== "string" || CAMPOS_EXCLUIDOS.has(clave)) continue;
    campos[clave] = valor;
  }

  const borrador = JSON.stringify({ id, campos });
  // El cuerpo admite 128 KB y el navegador descarta entera cualquier cookie que
  // pase de ~4 KB: sin este corte se enviaria una cabecera enorme para nada.
  if (encodeURIComponent(borrador).length > TOPE_BYTES) return;

  cookies.set(nombre, borrador, {
    path: ruta,
    httpOnly: true,
    sameSite: "lax",
    secure: import.meta.env.PROD,
    maxAge: VIDA_SEGUNDOS,
  });
}

/**
 * Lee el borrador y lo borra en el mismo paso. Devuelve un objeto vacio si no
 * hay, si esta corrupto o si es de otra fila.
 */
export function leerBorrador(
  cookies: AstroCookies,
  nombre: string,
  ruta: string,
  idEsperado: string | null = null,
): Record<string, string> {
  const galleta = cookies.get(nombre);
  if (!galleta) return {};
  cookies.delete(nombre, { path: ruta });

  let contenido: unknown;
  try {
    contenido = galleta.json();
  } catch {
    return {};
  }
  if (typeof contenido !== "object" || contenido === null) return {};

  const { id, campos } = contenido as { id?: unknown; campos?: unknown };
  const origen = typeof id === "string" ? id : null;
  if (origen !== idEsperado || typeof campos !== "object" || campos === null) return {};

  const valores: Record<string, string> = {};
  for (const [clave, valor] of Object.entries(campos)) {
    if (typeof valor === "string") valores[clave] = valor;
  }
  return valores;
}
