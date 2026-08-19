import { LIMITES } from "./contenido";
import { leerOrden } from "./orden";

export interface DatosPregunta {
  pregunta: string;
  respuesta: string;
  enlaceHref: string | null;
  enlaceTexto: string | null;
  orden: number;
}

/** Codigos de error que la vista traduce a texto. */
export type ErrorPregunta =
  "sinpregunta" | "preguntalarga" | "sinrespuesta" | "respuestalarga" | "enlace" | "orden";

// Los enlaces de accion apuntan a secciones de la propia landing (anclas). No se
// admiten URLs externas: evita convertir el panel en un redirector abierto.
const PATRON_ANCLA = /^#[a-z0-9-]{1,40}$/;

export function leerDatosPregunta(datos: FormData): {
  datos?: DatosPregunta;
  error?: ErrorPregunta;
} {
  const pregunta = String(datos.get("pregunta") ?? "").trim();
  if (!pregunta) return { error: "sinpregunta" };
  if (pregunta.length > LIMITES.pregunta) return { error: "preguntalarga" };

  const respuesta = String(datos.get("respuesta") ?? "").trim();
  if (!respuesta) return { error: "sinrespuesta" };
  if (respuesta.length > LIMITES.respuesta) return { error: "respuestalarga" };

  const enlaceHref = String(datos.get("enlace_href") ?? "").trim();
  const enlaceTexto = String(datos.get("enlace_texto") ?? "").trim();
  // Ambos campos o ninguno: un enlace sin texto no tiene nombre accesible.
  if (enlaceHref !== "" || enlaceTexto !== "") {
    if (enlaceHref === "" || enlaceTexto === "") return { error: "enlace" };
    if (!PATRON_ANCLA.test(enlaceHref)) return { error: "enlace" };
    if (enlaceTexto.length > LIMITES.altTexto) return { error: "enlace" };
  }

  const orden = leerOrden(datos);
  if (orden === null) return { error: "orden" };

  return {
    datos: {
      pregunta,
      respuesta,
      enlaceHref: enlaceHref === "" ? null : enlaceHref,
      enlaceTexto: enlaceTexto === "" ? null : enlaceTexto,
      orden,
    },
  };
}
