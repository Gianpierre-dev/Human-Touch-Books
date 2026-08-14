// Variables de entorno, leidas y validadas UNA sola vez al importar este modulo.
//
// POR QUE EXISTE
// Antes cada modulo leia `process.env` por su cuenta y toleraba la ausencia:
// `almacen.ts` construia el cliente de Wasabi con `?? ""` y `sesion.ts` lanzaba
// desde dentro de un `try` que se tragaba el error. El resultado era el peor de
// los mundos: el proceso arrancaba, el healthcheck respondia «ok» y el fallo
// aparecia mucho despues disfrazado de otra cosa — una clave faltante se veia
// como «token invalido» (bucle de login sin un solo log) y unas credenciales de
// almacenamiento vacias, como «tu imagen no es valida».
//
// Un fallo de configuracion tiene que ser ruidoso y temprano: al importarse
// este modulo desde el arranque, si falta algo el proceso muere ANTES de
// escuchar, Railway marca el despliegue como fallido y el mensaje nombra la
// variable exacta. Es la diferencia entre un despliegue rojo (dos minutos de
// diagnostico) y un sitio «sano» que no deja entrar a nadie.
//
// NO se valida DATABASE_URL: la lee Prisma y su fallo ya es ruidoso y claro.

/** Faltantes de UNA pasada: la lista completa evita descubrirlas de a una. */
function exigir(nombres: readonly string[]): Record<string, string> {
  const valores: Record<string, string> = {};
  const faltantes: string[] = [];

  for (const nombre of nombres) {
    const valor = process.env[nombre]?.trim();
    if (!valor) faltantes.push(nombre);
    else valores[nombre] = valor;
  }

  if (faltantes.length > 0) {
    throw new Error(
      `Faltan variables de entorno obligatorias: ${faltantes.join(", ")}. ` +
        "El proceso no arranca sin ellas: revisa el .env local o las variables del servicio.",
    );
  }
  return valores;
}

const VARIABLES = [
  "JWT_SECRET",
  "WASABI_ACCESS_KEY",
  "WASABI_SECRET_KEY",
  "WASABI_BUCKET_NAME",
  "WASABI_REGION",
  "WASABI_ENDPOINT",
] as const;

const valores = exigir(VARIABLES);

// Se exponen ya validadas y como `string` (no `string | undefined`): quien las
// consume no tiene que volver a preguntarse si existen.
export const ENTORNO = {
  jwtSecreto: valores.JWT_SECRET,
  wasabi: {
    accessKey: valores.WASABI_ACCESS_KEY,
    secretKey: valores.WASABI_SECRET_KEY,
    bucket: valores.WASABI_BUCKET_NAME,
    region: valores.WASABI_REGION,
    endpoint: valores.WASABI_ENDPOINT,
  },
} as const;
