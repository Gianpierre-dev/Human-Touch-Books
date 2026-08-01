// Contraste WCAG 2.1 (SC 1.4.3). Se usa para no dejar que un color elegido en el
// panel rompa la legibilidad de la pagina publica de su linea.
//
// El color de linea se usa de dos maneras opuestas: como TEXTO sobre fondo claro
// y como FONDO con texto blanco encima. La razon de contraste es simetrica, asi
// que UN solo numero —el contraste contra el blanco— cubre los dos casos: si el
// color llega a 4,5:1 contra blanco, tanto el texto de ese color sobre blanco
// como el texto blanco sobre ese color cumplen.

/** Umbral de texto normal en AA. Los titulos grandes admitirian 3:1, pero el
 *  color se usa tambien en texto de tamano corriente. */
export const CONTRASTE_MINIMO = 4.5;

const PATRON_HEX = /^#[0-9a-f]{6}$/i;

/** Linealiza un canal de 0-255 segun la formula de luminancia relativa. */
function canalLineal(valor: number): number {
  const proporcion = valor / 255;
  return proporcion <= 0.04045 ? proporcion / 12.92 : ((proporcion + 0.055) / 1.055) ** 2.4;
}

/** Luminancia relativa (0 = negro, 1 = blanco). Devuelve `null` si el hex no vale. */
export function luminanciaRelativa(hex: string): number | null {
  if (!PATRON_HEX.test(hex)) return null;
  const entero = Number.parseInt(hex.slice(1), 16);
  const rojo = canalLineal((entero >> 16) & 0xff);
  const verde = canalLineal((entero >> 8) & 0xff);
  const azul = canalLineal(entero & 0xff);
  return 0.2126 * rojo + 0.7152 * verde + 0.0722 * azul;
}

/** Razon de contraste entre dos colores hexadecimales, o `null` si alguno no vale. */
export function razonDeContraste(unHex: string, otroHex: string): number | null {
  const una = luminanciaRelativa(unHex);
  const otra = luminanciaRelativa(otroHex);
  if (una === null || otra === null) return null;
  const clara = Math.max(una, otra);
  const oscura = Math.min(una, otra);
  return (clara + 0.05) / (oscura + 0.05);
}

/** Contraste del color contra el blanco puro. `null` si el hex no vale. */
export function contrasteConBlanco(hex: string): number | null {
  return razonDeContraste(hex, "#ffffff");
}

/** `true` si el color sirve a la vez como texto sobre blanco y como fondo con blanco. */
export function sirveConBlanco(hex: string): boolean {
  const contraste = contrasteConBlanco(hex);
  return contraste !== null && contraste >= CONTRASTE_MINIMO;
}
