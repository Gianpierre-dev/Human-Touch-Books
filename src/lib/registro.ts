// Registro de fallos del servidor.
//
// POR QUE EXISTE
// Los errores del servidor se atendian tragandolos: `catch { return null }` o
// `catch { return redirect(...) }`. La consecuencia no es que el sitio se rompa
// —justamente sigue en pie— sino que un incidente real queda invisible: si las
// credenciales del almacenamiento vencen, TODAS las imagenes responden 404 y en
// los registros no hay una sola linea que lo diga. Diagnosticar eso es adivinar.
//
// La regla del proyecto pasa a ser: un fallo esperado (el visitante escribio mal
// el correo) NO se registra, porque no es un incidente y solo ensuciaria; un
// fallo inesperado (la base no responde, el bucket rechaza la firma) SIEMPRE se
// registra con su contexto, aunque a la persona se le muestre un mensaje amable.
//
// En Railway `console.error` va a los registros del despliegue, que es donde se
// mira. No hace falta un servicio externo para dejar de estar ciego.

/**
 * Registra un fallo inesperado con su contexto.
 *
 * @param contexto Que se estaba haciendo, en pocas palabras y en presente:
 *                 "guardar imagen en el bucket", "registrar mensaje de contacto".
 */
export function registrarFallo(contexto: string, fallo: unknown): void {
  const detalle = fallo instanceof Error ? (fallo.stack ?? fallo.message) : String(fallo);
  console.error(`[fallo] ${contexto}: ${detalle}`);
}
