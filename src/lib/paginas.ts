// Paginas institucionales (/nosotros/{clave}) y sus dos tipos de contenido
// interno: las SECCIONES grandes (Mision, Vision) y los VALORES (las tarjetas).
//
// A diferencia de src/lib/lineas.ts, aqui NO hay textos por defecto. El
// contenido institucional no se puede derivar del nombre de la pagina: si el
// cliente no escribio la mision, no hay mision que mostrar. Por eso cada
// seccion de la plantilla publica se omite cuando no tiene contenido, y una
// pagina con solo titular y parrafos tiene que verse digna por si sola.

import { leerOrden } from "./orden";

export interface DatosPagina {
  clave: string;
  titulo: string;
  orden: number;
}

/** Codigos de error que la vista traduce a texto. */
export type ErrorPagina =
  | "sintitulo"
  | "titulolargo"
  | "sinclave"
  | "clavelarga"
  | "claveformato"
  | "claverepetida"
  | "orden";

/** Limites de los campos de identidad (los espejan los `maxlength` del alta). */
export const LIMITES_PAGINA = {
  titulo: 60,
  clave: 40,
} as const;

// Mismo slug que las lineas: minusculas, digitos y guiones internos. Ni empieza
// ni termina en guion, y no admite guiones seguidos, para poder usarlo tal cual
// en la URL publica.
const PATRON_CLAVE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function leerDatosPagina(datos: FormData): { datos?: DatosPagina; error?: ErrorPagina } {
  const titulo = String(datos.get("titulo") ?? "").trim();
  if (!titulo) return { error: "sintitulo" };
  if (titulo.length > LIMITES_PAGINA.titulo) return { error: "titulolargo" };

  const clave = String(datos.get("clave") ?? "")
    .trim()
    .toLowerCase();
  if (!clave) return { error: "sinclave" };
  if (clave.length > LIMITES_PAGINA.clave) return { error: "clavelarga" };
  if (!PATRON_CLAVE.test(clave)) return { error: "claveformato" };

  const orden = leerOrden(datos);
  if (orden === null) return { error: "orden" };

  return { datos: { clave, titulo, orden } };
}

// ---------------------------------------------------------------------------
// Contenido de la pagina publica
// ---------------------------------------------------------------------------

/** Campos de contenido que administra el panel. Todos opcionales en la base. */
export interface ContenidoPagina {
  antetitulo: string | null;
  tituloPagina: string | null;
  tituloDestacado: string | null;
  parrafos: string | null;
  bloquesAntetitulo: string | null;
  bloquesTitulo: string | null;
  cierreTexto: string | null;
  cierreDestacado: string | null;
}

/** Limites del contenido (los espejan los `maxlength` del formulario). */
export const LIMITES_CONTENIDO_PAGINA = {
  antetitulo: 40,
  tituloPagina: 90,
  tituloDestacado: 60,
  parrafos: 1200,
  bloquesAntetitulo: 40,
  bloquesTitulo: 90,
  cierreTexto: 160,
  cierreDestacado: 90,
} as const;

/** Limite del texto alternativo de la fotografia. Va aparte: no es un texto. */
export const LIMITE_IMAGEN_ALT = 200;

export type ErrorContenidoPagina = `${keyof ContenidoPagina}largo`;

/**
 * Lee el formulario de contenido. Ningun campo es obligatorio: el vacio se
 * guarda como `null` y la seccion correspondiente simplemente no se dibuja.
 * Lo unico que se valida es el largo, porque el `maxlength` del navegador se
 * puede saltar.
 */
export function leerContenidoPagina(datos: FormData): {
  datos?: ContenidoPagina;
  error?: ErrorContenidoPagina;
} {
  const campos: { clave: keyof ContenidoPagina; campo: string }[] = [
    { clave: "antetitulo", campo: "antetitulo" },
    { clave: "tituloPagina", campo: "titulo_pagina" },
    { clave: "tituloDestacado", campo: "titulo_destacado" },
    { clave: "parrafos", campo: "parrafos" },
    { clave: "bloquesAntetitulo", campo: "bloques_antetitulo" },
    { clave: "bloquesTitulo", campo: "bloques_titulo" },
    { clave: "cierreTexto", campo: "cierre_texto" },
    { clave: "cierreDestacado", campo: "cierre_destacado" },
  ];

  // Se parte de un objeto vacio y el bucle lo completa con TODAS las claves,
  // pero TypeScript no puede probarlo durante el llenado.
  const contenido = {} as ContenidoPagina;
  for (const { clave, campo } of campos) {
    // El navegador envia los saltos de un textarea como CRLF (asi lo pide la
    // norma de formularios). Se normalizan a LF antes de guardar: el separador
    // de parrafos es una linea en blanco y conviene que en la base sea siempre
    // el mismo caracter.
    const valor = String(datos.get(campo) ?? "")
      .replace(/\r\n/g, "\n")
      .trim();
    if (valor.length > LIMITES_CONTENIDO_PAGINA[clave]) return { error: `${clave}largo` };
    contenido[clave] = valor === "" ? null : valor;
  }
  return { datos: contenido };
}

/** Separa un texto largo en parrafos reales: una linea en blanco los corta. */
export function partirEnParrafos(texto: string | null): readonly string[] {
  if (!texto) return [];
  return texto
    .split(/\n\s*\n/)
    .map((parrafo) => parrafo.trim())
    .filter((parrafo) => parrafo !== "");
}

// ---------------------------------------------------------------------------
// Secciones y valores
// ---------------------------------------------------------------------------

export const LIMITES_SECCION = { titulo: 40, texto: 900, destacado: 220 } as const;
export const LIMITES_VALOR = { titulo: 40, texto: 220 } as const;

export interface DatosSeccion {
  titulo: string;
  texto: string;
  destacado: string | null;
  orden: number;
}

export interface DatosValor {
  titulo: string;
  texto: string;
  orden: number;
}

export type ErrorSeccion =
  "sintitulo" | "titulolargo" | "sintexto" | "textolargo" | "destacadolargo" | "orden";

// El textarea llega con CRLF; se normaliza igual que el contenido de la pagina
// porque estos textos tambien separan parrafos con una linea en blanco.
function leerTextoLargo(datos: FormData, campo: string): string {
  return String(datos.get(campo) ?? "")
    .replace(/\r\n/g, "\n")
    .trim();
}

export function leerDatosSeccion(datos: FormData): {
  datos?: DatosSeccion;
  error?: ErrorSeccion;
} {
  const titulo = String(datos.get("titulo") ?? "").trim();
  if (!titulo) return { error: "sintitulo" };
  if (titulo.length > LIMITES_SECCION.titulo) return { error: "titulolargo" };

  const texto = leerTextoLargo(datos, "texto");
  if (!texto) return { error: "sintexto" };
  if (texto.length > LIMITES_SECCION.texto) return { error: "textolargo" };

  const destacadoTexto = leerTextoLargo(datos, "destacado");
  if (destacadoTexto.length > LIMITES_SECCION.destacado) return { error: "destacadolargo" };

  const orden = leerOrden(datos);
  if (orden === null) return { error: "orden" };

  return {
    datos: { titulo, texto, destacado: destacadoTexto === "" ? null : destacadoTexto, orden },
  };
}

export type ErrorValor = "sintitulo" | "titulolargo" | "sintexto" | "textolargo" | "orden";

export function leerDatosValor(datos: FormData): { datos?: DatosValor; error?: ErrorValor } {
  const titulo = String(datos.get("titulo") ?? "").trim();
  if (!titulo) return { error: "sintitulo" };
  if (titulo.length > LIMITES_VALOR.titulo) return { error: "titulolargo" };

  const texto = leerTextoLargo(datos, "texto");
  if (!texto) return { error: "sintexto" };
  if (texto.length > LIMITES_VALOR.texto) return { error: "textolargo" };

  const orden = leerOrden(datos);
  if (orden === null) return { error: "orden" };

  return { datos: { titulo, texto, orden } };
}

// ---------------------------------------------------------------------------
// Estilos fijos por posicion
// ---------------------------------------------------------------------------
//
// EL ICONO Y EL COLOR NO SON EDITABLES.
// Misma decision que en src/lib/bloques-linea.ts, por las mismas dos razones:
// son trazos SVG (pedirlos por formulario seria pedirle codigo al cliente y
// abriria una via de inyeccion de marcado) y el color debe seguir cumpliendo
// contraste. Cada seccion y cada valor conserva el estilo que le toca POR
// POSICION, y si se cargan mas elementos que estilos el arreglo se recorre en
// ciclo para que ninguno quede sin simbolo.
//
// LIMITE CONOCIDO DE ASIGNAR POR POSICION: el orden elegido reproduce
// exactamente la pieza de «Quienes somos» (corazon, personas, escudo) y solo
// coincide en parte con la tira de valores de «Mision y vision» (ahi la pieza
// abre con un libro). Se prefirio un unico arreglo compartido antes que un
// catalogo de iconos por pagina: reordenar sigue siendo la unica palanca y se
// avisa en el panel.

export interface EstiloPagina {
  color: string;
  icono: string;
}

/** Secciones grandes: mision (diana) y vision (ojo). */
export const ESTILOS_SECCION: readonly EstiloPagina[] = [
  {
    color: "#124a99",
    icono:
      "M12 2a10 10 0 1 0 10 10h-2a8 8 0 1 1-8-8V2Zm0 4a6 6 0 1 0 6 6h-2a4 4 0 1 1-4-4V6Zm0 4a2 2 0 1 0 2 2h-2v-2Zm7.3-7.3-2.6 2.6 1.4 1.4 2.6-2.6-1.4-1.4Z",
  },
  {
    color: "#1e6fd9",
    icono:
      "M12 5C6.5 5 2.7 9.1 1.5 12c1.2 2.9 5 7 10.5 7s9.3-4.1 10.5-7c-1.2-2.9-5-7-10.5-7Zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10Zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
  },
];

/** Valores: etica (corazon en la mano), compromiso (personas), excelencia
 *  (escudo con check) y un cuarto de alcance (globo) para las tiras de cuatro. */
export const ESTILOS_VALOR: readonly EstiloPagina[] = [
  {
    color: "#d5232b",
    icono:
      "M12 21s-7.5-4.8-9.5-9C1 8.5 3 5.5 6 5.5c1.8 0 3.2 1 4 2.2.8-1.2 2.2-2.2 4-2.2 3 0 5 3 3.5 6.5-2 4.2-9.5 9-9.5 9Z",
  },
  {
    color: "#12803c",
    icono:
      "M16 11c1.7 0 3-1.3 3-3s-1.3-3-3-3-3 1.3-3 3 1.3 3 3 3Zm-8 0c1.7 0 3-1.3 3-3S9.7 5 8 5 5 6.3 5 8s1.3 3 3 3Zm0 2c-2.3 0-7 1.2-7 3.5V19h14v-2.5c0-2.3-4.7-3.5-7-3.5Zm8 0c-.3 0-.6 0-1 .1 1.2.8 2 2 2 3.4V19h6v-2.5c0-2.3-4.7-3.5-7-3.5Z",
  },
  {
    color: "#124a99",
    icono:
      "M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Zm-1 14-3.5-3.5 1.4-1.4L11 13.2l4.6-4.6 1.4 1.4L11 16Z",
  },
  {
    color: "#a15c00",
    icono:
      "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.9 6h-2.9a15.6 15.6 0 0 0-1.3-3.4A8 8 0 0 1 18.9 8ZM12 4.2c.7 1 1.3 2.3 1.7 3.8h-3.4c.4-1.5 1-2.8 1.7-3.8ZM4.3 14A8 8 0 0 1 4 12c0-.7.1-1.4.3-2h3.3a17 17 0 0 0 0 4H4.3Zm.8 2H8c.3 1.2.8 2.4 1.3 3.4A8 8 0 0 1 5.1 16Zm2.9-8H5.1a8 8 0 0 1 4.2-3.4C8.8 5.6 8.3 6.8 8 8Zm4 11.8c-.7-1-1.3-2.3-1.7-3.8h3.4c-.4 1.5-1 2.8-1.7 3.8ZM14.1 14H9.9a15.3 15.3 0 0 1 0-4h4.2a15.3 15.3 0 0 1 0 4Zm.5 5.4c.5-1 1-2.2 1.3-3.4h2.9a8 8 0 0 1-4.2 3.4Zm1.7-5.4a17 17 0 0 0 0-4h3.4c.2.6.3 1.3.3 2s-.1 1.4-.3 2h-3.4Z",
  },
];
