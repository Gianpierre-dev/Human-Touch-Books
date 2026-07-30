import jwt from "jsonwebtoken";

export const COOKIE_SESION = "sesion_htb";
const DURACION_SEGUNDOS = 60 * 60 * 8; // 8 horas

// Largo de la contrasena del panel. El maximo no es estetico: bcrypt solo mira
// los primeros 72 bytes de la clave, asi que aceptar mas seria mentir sobre la
// seguridad que se gana escribiendo mas caracteres.
export const LARGO_MINIMO_CLAVE = 10;
export const LARGO_MAXIMO_CLAVE = 72;

export interface CargaSesion {
  usuarioId: string;
  correo: string;
  // Version de la credencial en segundos epoch. El middleware la compara con la
  // de la BD: si la contrasena cambio despues de emitir el token, el token
  // queda invalidado sin esperar a que expire.
  claveActualizadaEn: number;
}

/** Marca de version que se guarda en el token a partir de la fecha de la BD. */
export function versionClave(claveActualizadaEn: Date): number {
  return Math.floor(claveActualizadaEn.getTime() / 1000);
}

function secreto(): string {
  const valor = process.env.JWT_SECRET;
  if (!valor) {
    throw new Error("Falta la variable de entorno JWT_SECRET");
  }
  return valor;
}

export function crearToken(carga: CargaSesion): string {
  return jwt.sign(carga, secreto(), { expiresIn: DURACION_SEGUNDOS });
}

export function verificarToken(token: string | undefined): CargaSesion | null {
  if (!token) return null;
  try {
    const carga = jwt.verify(token, secreto()) as Partial<CargaSesion>;
    // Los tokens emitidos antes del versionado no traen la marca: sin ella no
    // hay forma de saber si la contrasena cambio, asi que no se aceptan.
    if (typeof carga.claveActualizadaEn !== "number") return null;
    if (!carga.usuarioId || !carga.correo) return null;
    return {
      usuarioId: carga.usuarioId,
      correo: carga.correo,
      claveActualizadaEn: carga.claveActualizadaEn,
    };
  } catch {
    return null;
  }
}

const SEGURA = import.meta.env.PROD ? "; Secure" : "";

export function cabeceraCookieSesion(token: string): string {
  return `${COOKIE_SESION}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${DURACION_SEGUNDOS}${SEGURA}`;
}

// Los mismos atributos que la cookie de sesion (incluido Secure en produccion):
// el navegador solo borra una cookie si el borrado le llega con los mismos.
export function cabeceraCookieSalir(): string {
  return `${COOKIE_SESION}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${SEGURA}`;
}
