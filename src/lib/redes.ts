// Redes sociales de la editorial.
//
// Se administran desde /admin/ajustes con una fila por red, igual que el resto
// de los datos de contacto. Una red sin fila (o con el campo vaciado) NO se
// muestra en el pie: el catalogo de abajo es la unica fuente de verdad de que
// redes existen, que direcciones se aceptan y como se llaman en la interfaz.

/** Largo maximo de una direccion de perfil. */
export const LARGO_MAXIMO_RED = 200;

/** Direcciones cargadas, ya resueltas para el pie y para el JSON-LD. */
export interface RedesSociales {
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
}

export interface RedSocial {
  /** Campo con el que viaja la direccion hasta el pie. */
  campo: keyof RedesSociales;
  /** Clave de la fila de ajustes y nombre del campo del formulario. */
  clave: string;
  /** Nombre propio de la red, tal cual se escribe en la interfaz. */
  nombre: string;
  /** Dominios aceptados. La direccion puede traerlos con o sin «www.». */
  dominios: readonly string[];
  /** Direccion de ejemplo: es el placeholder del panel y el texto del error. */
  ejemplo: string;
}

export const REDES: readonly RedSocial[] = [
  {
    campo: "facebook",
    clave: "red_facebook",
    nombre: "Facebook",
    dominios: ["facebook.com"],
    ejemplo: "https://www.facebook.com/humantouchbooks",
  },
  {
    campo: "instagram",
    clave: "red_instagram",
    nombre: "Instagram",
    dominios: ["instagram.com"],
    ejemplo: "https://www.instagram.com/humantouchbooks",
  },
  {
    campo: "tiktok",
    clave: "red_tiktok",
    nombre: "TikTok",
    dominios: ["tiktok.com"],
    ejemplo: "https://www.tiktok.com/@humantouchbooks",
  },
  {
    campo: "youtube",
    clave: "red_youtube",
    nombre: "YouTube",
    dominios: ["youtube.com", "youtu.be"],
    ejemplo: "https://www.youtube.com/@humantouchbooks",
  },
];

/**
 * Comprueba que la direccion sea https y apunte al dominio de esa red. Se
 * valida en el servidor porque el `type="url"` del navegador acepta cualquier
 * dominio y el formulario se puede enviar a mano.
 */
export function esDireccionDeRed(red: RedSocial, valor: string): boolean {
  let direccion: URL;
  try {
    direccion = new URL(valor);
  } catch {
    return false;
  }
  if (direccion.protocol !== "https:") return false;
  const anfitrion = direccion.hostname.toLowerCase().replace(/^www\./, "");
  return red.dominios.includes(anfitrion);
}

/** Direcciones cargadas, a partir del mapa de ajustes que ya arma cada pagina. */
export function resolverRedes(ajustes: Record<string, string>): RedesSociales {
  const redes: RedesSociales = {};
  for (const red of REDES) {
    const valor = ajustes[red.clave];
    if (valor) redes[red.campo] = valor;
  }
  return redes;
}

/** Direcciones cargadas en el orden del catalogo. Vacio = no hay ninguna. */
export function listarRedes(redes: RedesSociales): { red: RedSocial; url: string }[] {
  const cargadas: { red: RedSocial; url: string }[] = [];
  for (const red of REDES) {
    const url = redes[red.campo];
    if (url) cargadas.push({ red, url });
  }
  return cargadas;
}
