import jwt from "jsonwebtoken";

export const COOKIE_SESION = "sesion_htb";
const DURACION_SEGUNDOS = 60 * 60 * 8; // 8 horas

interface CargaSesion {
  usuarioId: string;
  correo: string;
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
    return jwt.verify(token, secreto()) as CargaSesion;
  } catch {
    return null;
  }
}

export function cabeceraCookieSesion(token: string): string {
  const segura = import.meta.env.PROD ? "; Secure" : "";
  return `${COOKIE_SESION}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${DURACION_SEGUNDOS}${segura}`;
}

export function cabeceraCookieSalir(): string {
  return `${COOKIE_SESION}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}
