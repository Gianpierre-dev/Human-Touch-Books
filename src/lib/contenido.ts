// Contenido administrable de la landing: definiciones compartidas entre el panel
// (/admin) y la pagina publica. Los valores por defecto son EXACTAMENTE los que
// la landing ya mostraba, para que la web no cambie mientras no se cargue nada.

/** Espacios de imagen fijos de la landing. La lista es cerrada a proposito. */
export const CLAVES_IMAGEN_SITIO = ["nosotros_retrato", "plataforma_imagen"] as const;

export type ClaveImagenSitio = (typeof CLAVES_IMAGEN_SITIO)[number];

export interface EspacioImagen {
  clave: ClaveImagenSitio;
  etiqueta: string;
  ayuda: string;
  /** Imagen del repositorio que se usa mientras no haya una cargada. */
  imagenUrl: string;
  altTexto: string;
  ancho: number;
  alto: number;
}

export const ESPACIO_NOSOTROS: EspacioImagen = {
  clave: "nosotros_retrato",
  etiqueta: "Retrato — sección Nosotros",
  ayuda: "Orientación vertical (retrato). Se muestra en una columna de 240 px de ancho.",
  imagenUrl: "/mock/bisquerra.webp",
  altTexto: "Retrato de Rafael Bisquerra Alzina",
  ancho: 368,
  alto: 586,
};

export const ESPACIO_PLATAFORMA: EspacioImagen = {
  clave: "plataforma_imagen",
  etiqueta: "Imagen — sección Plataforma",
  ayuda: "Orientación cuadrada u horizontal. Se muestra en una tarjeta de hasta 340 px de ancho.",
  imagenUrl: "/mock/laptop-smarti-limpio.webp",
  altTexto:
    "La plataforma Tutoría SMART abierta en una laptop, con la pantalla de ingreso de Human Touch Books",
  ancho: 470,
  alto: 712,
};

export const ESPACIOS_IMAGEN: readonly EspacioImagen[] = [ESPACIO_NOSOTROS, ESPACIO_PLATAFORMA];

export function esClaveImagenSitio(valor: string): valor is ClaveImagenSitio {
  return (CLAVES_IMAGEN_SITIO as readonly string[]).includes(valor);
}

/**
 * Imagen del hero mientras no haya ninguna cargada en el panel. Las medidas son
 * las del archivo del repositorio; como fondo a pantalla completa se ve blanda,
 * asi que conviene reemplazarla desde /admin/portada con una foto grande.
 */
export const HERO_POR_DEFECTO = {
  imagenUrl: "/mock/hero-estudiantes-limpio.webp",
  altTexto:
    "Estudiantes del proyecto Tutoría SMART junto a la tarjeta de Capacitaciones y Talleres y la distribuidora MBM",
  ancho: 505,
  alto: 336,
} as const;

/** Textos administrables del hero y de Nosotros, con su valor actual de la web. */
export const SUBTITULO_HERO_POR_DEFECTO = "Formación integral para una nueva generación";

export function textoNosotrosPorDefecto(ubicacion: string): string {
  return (
    `Human Touch Books trabaja desde ${ubicacion} con dos líneas editoriales: textos escolares ` +
    "de tutoría, orientación educativa y convivencia escolar, y una línea de Plan Lector. " +
    "Atendemos consultas de colegios y de padres de familia, y coordinamos capacitaciones y talleres."
  );
}

/** Limites de los campos de texto administrables (los espejan los `maxlength`). */
export const LIMITES = {
  altTexto: 200,
  pregunta: 200,
  respuesta: 600,
  subtituloHero: 120,
  textoNosotros: 500,
  horario: 120,
  ubicacion: 120,
} as const;
