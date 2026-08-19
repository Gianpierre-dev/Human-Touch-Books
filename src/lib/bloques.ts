// Colecciones administrables de bloques cortos de la landing: los cuatro
// bloques de "Qué aporta Tutoría SMART" y las cuatro tarjetas de la sección
// Plataforma. Comparten forma (título + texto + orden + visibilidad), así que
// comparten validador.
//
// Con la tabla vacía la web muestra los arreglos de este archivo, igual que
// hace el FAQ con sus preguntas: producción nunca queda sin contenido.

import { leerOrden } from "./orden";

export interface BloqueVista {
  titulo: string;
  texto: string;
}

export const LIMITES_BLOQUE = { titulo: 60, texto: 220 } as const;
export const LIMITES_CHIP = { titulo: 40, texto: 140 } as const;

// LOS ICONOS NO SON EDITABLES.
// Son trazos SVG: pedirlos por formulario sería pedirle código al cliente y
// abriría una vía de inyección de marcado. Cada bloque conserva el icono que le
// toca POR POSICIÓN: el primero de la lista usa el primer icono, el segundo el
// segundo, etc. Si se cargan más elementos que iconos, la lista se recorre en
// ciclo (elemento 5 → primer icono) para que ninguna tarjeta quede sin símbolo.
export const ICONOS_VALOR: readonly string[] = [
  "M12 3 2 8l10 5 8-4v5h2V8L12 3Zm-6 9v4c0 1.7 2.7 3 6 3s6-1.3 6-3v-4l-6 3-6-3Z",
  "M16 11c1.7 0 3-1.3 3-3s-1.3-3-3-3-3 1.3-3 3 1.3 3 3 3Zm-8 0c1.7 0 3-1.3 3-3S9.7 5 8 5 5 6.3 5 8s1.3 3 3 3Zm0 2c-2.3 0-7 1.2-7 3.5V19h14v-2.5c0-2.3-4.7-3.5-7-3.5Zm8 0c-.3 0-.6 0-1 .1 1.2.8 2 2 2 3.4V19h6v-2.5c0-2.3-4.7-3.5-7-3.5Z",
  "M12 2 4.5 20.3l.7.7L12 18l6.8 3 .7-.7L12 2Z",
  "M12 21s-7.5-4.8-9.5-9C1 8.5 3 5.5 6 5.5c1.8 0 3.2 1 4 2.2.8-1.2 2.2-2.2 4-2.2 3 0 5 3 3.5 6.5-2 4.2-9.5 9-9.5 9Z",
];

/** Bloques de "Qué aporta Tutoría SMART" mientras la tabla esté vacía. */
export const BLOQUES_VALOR_POR_DEFECTO: readonly BloqueVista[] = [
  {
    titulo: "Aprendizaje significativo",
    texto:
      "Metodologías activas que llevan a tus estudiantes de la explicación a la comprensión y la reflexión.",
  },
  {
    titulo: "Habilidades para convivir",
    texto:
      "Sesiones que fortalecen las competencias socioemocionales y de convivencia dentro del aula.",
  },
  {
    titulo: "Preparados para decidir",
    texto:
      "Herramientas para acompañar la toma de decisiones y la construcción del proyecto de vida.",
  },
  {
    titulo: "Un texto por cada grado",
    texto:
      "Materiales y recursos graduados para que la tutoría tenga continuidad en todos los años de primaria.",
  },
];

/** Color, fondo e icono de cada tarjeta de Plataforma. Mismo criterio: fijos. */
export interface EstiloChip {
  color: string;
  bg: string;
  icono: string;
}

export const ESTILOS_CHIP: readonly EstiloChip[] = [
  {
    color: "#124a99",
    bg: "#e8f1fd",
    icono:
      "M16 11c1.7 0 3-1.3 3-3s-1.3-3-3-3-3 1.3-3 3 1.3 3 3 3Zm-8 0c1.7 0 3-1.3 3-3S9.7 5 8 5 5 6.3 5 8s1.3 3 3 3Zm0 2c-2.3 0-7 1.2-7 3.5V19h14v-2.5c0-2.3-4.7-3.5-7-3.5Zm8 0c-.3 0-.6 0-1 .1 1.2.8 2 2 2 3.4V19h6v-2.5c0-2.3-4.7-3.5-7-3.5Z",
  },
  {
    color: "#12803c",
    bg: "#e8f7ee",
    icono: "M12 3 2 8l10 5 8-4v5h2V8L12 3Zm-6 9v4c0 1.7 2.7 3 6 3s6-1.3 6-3v-4l-6 3-6-3Z",
  },
  {
    color: "#5b21b6",
    bg: "#f1eafd",
    icono:
      "M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Zm-1 14-3.5-3.5 1.4-1.4L11 13.2l4.6-4.6 1.4 1.4L11 16Z",
  },
  {
    color: "#a15c00",
    bg: "#fdf3e0",
    icono: "M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z",
  },
];

/** Tarjetas de Plataforma mientras la tabla esté vacía. */
export const CHIPS_PLATAFORMA_POR_DEFECTO: readonly BloqueVista[] = [
  {
    titulo: "Comunidad conectada",
    texto: "Docentes, directores, familias y alumnos en un mismo espacio.",
  },
  {
    titulo: "Recursos educativos",
    texto: "Material de la colección disponible cuando lo necesitas.",
  },
  {
    titulo: "Entorno seguro",
    texto: "Protegemos tu información y la de tus estudiantes.",
  },
  {
    titulo: "Comunicación eficiente",
    texto: "Mensajería y avisos en tiempo real.",
  },
];

export interface DatosBloque {
  titulo: string;
  texto: string;
  orden: number;
}

/** Codigos de error que la vista traduce a texto. */
export type ErrorBloque = "sintitulo" | "titulolargo" | "sintexto" | "textolargo" | "orden";

export interface LimitesBloque {
  titulo: number;
  texto: number;
}

/**
 * Lee y valida el formulario de un bloque o de un chip. El `maxlength` del
 * navegador se puede saltar, asi que el limite se comprueba tambien aqui.
 */
export function leerDatosBloque(
  datos: FormData,
  limites: LimitesBloque,
): { datos?: DatosBloque; error?: ErrorBloque } {
  const titulo = String(datos.get("titulo") ?? "").trim();
  if (!titulo) return { error: "sintitulo" };
  if (titulo.length > limites.titulo) return { error: "titulolargo" };

  const texto = String(datos.get("texto") ?? "").trim();
  if (!texto) return { error: "sintexto" };
  if (texto.length > limites.texto) return { error: "textolargo" };

  const orden = leerOrden(datos);
  if (orden === null) return { error: "orden" };

  return { datos: { titulo, texto, orden } };
}

/**
 * Resuelve la lista que se muestra en la web. Distingue dos situaciones que no
 * son lo mismo:
 * - nadie cargo nada todavia (tabla vacia): se usa el arreglo del diseno;
 * - hay elementos cargados pero todos ocultos: se respeta la decision y no se
 *   muestra ninguno. Caer al diseno aqui resucitaria textos que quien
 *   administra creia reemplazados.
 * El icono se asigna por posicion (ver nota arriba).
 */
export function resolverColeccion(
  cargados: readonly BloqueVista[],
  porDefecto: readonly BloqueVista[],
  totalCargados: number = cargados.length,
): readonly BloqueVista[] {
  return totalCargados > 0 ? cargados : porDefecto;
}
