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

// Antes esto pasaba por un `Record<string, string>` intermedio, y ese tipo
// mentia dos veces: prometia `string` para CUALQUIER clave —incluida una mal
// escrita— y obligaba a mantener la lista de nombres en dos sitios (el arreglo
// que se validaba y el objeto que se exponia). Anadir una variable al objeto y
// olvidarla en la lista compilaba sin una queja y llegaba a produccion como
// `undefined`. Leyendo cada nombre UNA sola vez, en el mismo lugar donde se
// expone, esa clase de fallo deja de existir.

const faltantes: string[] = [];

/**
 * Lee una variable obligatoria.
 *
 * Devuelve "" cuando falta en lugar de lanzar en el acto para poder reunir
 * TODAS las que faltan y nombrarlas juntas: descubrirlas de a una son cuatro
 * despliegues rojos seguidos. Ese "" no llega a nadie — el `throw` de abajo
 * corre antes de que el modulo termine de evaluarse.
 */
function leer(nombre: string): string {
  const valor = process.env[nombre]?.trim();
  if (valor) return valor;
  faltantes.push(nombre);
  return "";
}

// Se exponen ya validadas y como `string` (no `string | undefined`): quien las
// consume no tiene que volver a preguntarse si existen.
export const ENTORNO = {
  jwtSecreto: leer("JWT_SECRET"),
  wasabi: {
    accessKey: leer("WASABI_ACCESS_KEY"),
    secretKey: leer("WASABI_SECRET_KEY"),
    bucket: leer("WASABI_BUCKET_NAME"),
    region: leer("WASABI_REGION"),
    endpoint: leer("WASABI_ENDPOINT"),
  },
} as const;

if (faltantes.length > 0) {
  throw new Error(
    `Faltan variables de entorno obligatorias: ${faltantes.join(", ")}. ` +
      "El proceso no arranca sin ellas: revisa el .env local o las variables del servicio.",
  );
}
