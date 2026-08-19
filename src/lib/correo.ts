// Forma de una direccion de correo, compartida por el alta de cuentas del panel
// y el correo de contacto del sitio.
//
// El patron es deliberadamente laxo: comprobar que un buzon existe de verdad es
// imposible desde aqui, asi que solo se descarta lo que con seguridad no es una
// direccion («informes@», «hola», un espacio en medio). Eso ya evita el caso
// que importa: un valor a medias guardado como correo de contacto deja el
// `mailto:` de toda la web y el JSON-LD apuntando a ninguna parte.

/** Tope del campo (lo espejan los `maxlength` de los formularios). */
export const LARGO_MAXIMO_CORREO = 160;

const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function esCorreoValido(valor: string): boolean {
  return valor.length <= LARGO_MAXIMO_CORREO && PATRON_CORREO.test(valor);
}
