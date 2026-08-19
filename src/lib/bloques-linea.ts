// Bloques cortos de la pagina publica de una linea: los PILARES (una etiqueta
// bajo un circulo de color) y los ARGUMENTOS (etiqueta + frase). Comparten
// tabla y validador; los distingue el campo `tipo`.
//
// EL ICONO Y EL COLOR NO SON EDITABLES.
// Misma decision que en src/lib/bloques.ts, por las mismas dos razones: son
// trazos SVG (pedirlos por formulario seria pedirle codigo al cliente y abriria
// una via de inyeccion de marcado) y el color debe seguir cumpliendo contraste.
// Cada bloque conserva el estilo que le toca POR POSICION: el primero de la
// lista usa el primer estilo, el segundo el segundo, etc. Si se cargan mas
// bloques que estilos, el arreglo se recorre en ciclo (bloque 5 -> primer
// estilo) para que ninguno quede sin simbolo.
//
// Los colores NO son los del arte original (amarillos y rosas neon): todos los
// de estos arreglos llegan al menos a 4,5:1 contra blanco, que es lo que
// necesitan los circulos con icono blanco encima.

import { leerOrden } from "./orden";

export interface EstiloBloqueLinea {
  color: string;
  icono: string;
}

/** Pilares: emocion, convivencia, desarrollo personal, aprendizaje. */
export const ESTILOS_PILAR: readonly EstiloBloqueLinea[] = [
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
    color: "#a15c00",
    icono: "m12 2 2.4 7.2H22l-6 4.6 2.3 7.2-6.3-4.4-6.3 4.4L8 13.8 2 9.2h7.6L12 2Z",
  },
  {
    color: "#1e6fd9",
    icono:
      "M4 3h6a3 3 0 0 1 2 .8A3 3 0 0 1 14 3h6v15h-6a2 2 0 0 0-2 1.6A2 2 0 0 0 10 18H4V3Zm2 2v11h4a4 4 0 0 1 1 .1V6.9A1.9 1.9 0 0 0 9.6 5H6Zm12 0h-3.6A1.9 1.9 0 0 0 13 6.9v10.2a4 4 0 0 1 1-.1h4V5Z",
  },
];

/** Argumentos: niveles, material docente, respaldo academico, curriculo. */
export const ESTILOS_ARGUMENTO: readonly EstiloBloqueLinea[] = [
  {
    color: "#6d28d9",
    icono: "m12 2 2.4 7.2H22l-6 4.6 2.3 7.2-6.3-4.4-6.3 4.4L8 13.8 2 9.2h7.6L12 2Z",
  },
  {
    color: "#12803c",
    icono: "M12 3 2 8l10 5 8-4v5h2V8L12 3Zm-6 9v4c0 1.7 2.7 3 6 3s6-1.3 6-3v-4l-6 3-6-3Z",
  },
  {
    color: "#d5232b",
    icono:
      "M12 21s-7.5-4.8-9.5-9C1 8.5 3 5.5 6 5.5c1.8 0 3.2 1 4 2.2.8-1.2 2.2-2.2 4-2.2 3 0 5 3 3.5 6.5-2 4.2-9.5 9-9.5 9Z",
  },
  {
    color: "#1e6fd9",
    icono:
      "M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Zm-1 14-3.5-3.5 1.4-1.4L11 13.2l4.6-4.6 1.4 1.4L11 16Z",
  },
];

export type TipoBloque = "pilar" | "argumento";

export const TIPOS_BLOQUE_LINEA: readonly TipoBloque[] = ["pilar", "argumento"];

export function esTipoBloqueLinea(valor: string): valor is TipoBloque {
  return (TIPOS_BLOQUE_LINEA as readonly string[]).includes(valor);
}

/** Estilos que le tocan a cada tipo. */
export function estilosDe(tipo: TipoBloque): readonly EstiloBloqueLinea[] {
  return tipo === "pilar" ? ESTILOS_PILAR : ESTILOS_ARGUMENTO;
}

/**
 * Limites por tipo: la etiqueta del pilar cabe en dos lineas cortas bajo su
 * circulo, asi que se acota mas que el titulo de un argumento.
 */
export const LIMITES_PILAR = { titulo: 40, texto: 0 } as const;
export const LIMITES_ARGUMENTO = { titulo: 60, texto: 220 } as const;

export function limitesDe(tipo: TipoBloque): { titulo: number; texto: number } {
  return tipo === "pilar" ? LIMITES_PILAR : LIMITES_ARGUMENTO;
}

export interface DatosBloqueLinea {
  titulo: string;
  texto: string | null;
  orden: number;
}

export type ErrorBloqueLinea =
  "sintitulo" | "titulolargo" | "sintexto" | "textolargo" | "orden" | "tipo";

/**
 * Lee y valida el formulario de un pilar o de un argumento. El `maxlength` del
 * navegador se puede saltar, asi que el limite se comprueba tambien aqui.
 * El texto es obligatorio en los argumentos y se ignora en los pilares.
 */
export function leerDatosBloqueLinea(
  datos: FormData,
  tipo: TipoBloque,
): { datos?: DatosBloqueLinea; error?: ErrorBloqueLinea } {
  const limites = limitesDe(tipo);

  const titulo = String(datos.get("titulo") ?? "").trim();
  if (!titulo) return { error: "sintitulo" };
  if (titulo.length > limites.titulo) return { error: "titulolargo" };

  let texto: string | null = null;
  if (tipo === "argumento") {
    texto = String(datos.get("texto") ?? "").trim();
    if (!texto) return { error: "sintexto" };
    if (texto.length > limites.texto) return { error: "textolargo" };
  }

  const orden = leerOrden(datos);
  if (orden === null) return { error: "orden" };

  return { datos: { titulo, texto, orden } };
}
