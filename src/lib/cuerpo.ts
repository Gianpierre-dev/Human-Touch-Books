// Lectura acotada del cuerpo de una peticion.
//
// EL PROBLEMA QUE RESUELVE
// `await request.formData()` materializa el cuerpo ENTERO en memoria antes de
// que nadie pueda opinar sobre su tamaño. En un contenedor de ~100 MB eso
// significa que un POST grande lo tumba, y el peor caso no era ni siquiera el
// panel: `/api/admin/sesion` esta exento de sesion, de modo que cualquiera sin
// credenciales podia enviar un cuerpo enorme y el limitador de intentos —que se
// consulta DESPUES— no llegaba a enterarse.
//
// POR QUE NO ALCANZA MIRAR CONTENT-LENGTH
// La cabecera la escribe quien llama y puede no venir: con
// `Transfer-Encoding: chunked` no hay Content-Length, y un valor no numerico
// produce `NaN`, que NUNCA es mayor que el tope (`NaN > 100000` es false). Las
// dos formas dejaban pasar el cuerpo entero. Aqui la cabecera solo sirve para
// rechazar temprano y barato lo que ya se declara demasiado grande; el limite
// de verdad se aplica CONTANDO LOS BYTES segun llegan, que no se puede mentir.

/** El cuerpo supero el tope permitido. Se responde sin materializarlo. */
export class ErrorCuerpoExcedido extends Error {
  constructor() {
    super("El cuerpo de la peticion supera el tamaño permitido");
    this.name = "ErrorCuerpoExcedido";
  }
}

/** Formularios sin archivos: solo campos de texto con limites propios. */
export const TAMANO_FORMULARIO = 128 * 1024; // 128 KB

/**
 * Formularios con imagen. Las imagenes se validan aparte a 5 MB
 * (`esPortadaValida`); este tope solo evita que el cuerpo crezca sin control
 * antes de llegar a esa comprobacion, asi que va algo por encima.
 */
export const TAMANO_FORMULARIO_CON_ARCHIVO = 7 * 1024 * 1024; // 7 MB

/**
 * Respuesta para los formularios de SOLO TEXTO del panel.
 *
 * Ahi el tope no lo alcanza nadie por accidente —son campos con `maxlength` de
 * decenas o cientos de caracteres—, asi que llegar aqui significa que alguien
 * con sesion esta enviando un cuerpo a mano. Un 413 con una frase es la
 * respuesta correcta y evita tener que inventar un mensaje de pantalla para
 * una situacion que quien administra no va a ver nunca. Los formularios CON
 * IMAGEN son otra historia: ahi si se puede pasar de tamaño sin querer, y por
 * eso esos endpoints redirigen a su pantalla con `?error=tamano`.
 */
export function respuestaCuerpoExcedido(): Response {
  return new Response("El envío es demasiado grande.", {
    status: 413,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

/**
 * Devuelve el formulario de la peticion sin permitir que el cuerpo pase del
 * tope. Lanza `ErrorCuerpoExcedido` cuando lo supera.
 */
export async function leerFormulario(request: Request, maximo: number): Promise<FormData> {
  // Rechazo temprano: si YA se declara demasiado grande, no hay nada que leer.
  const declarado = Number(request.headers.get("content-length"));
  if (Number.isFinite(declarado) && declarado > maximo) {
    throw new ErrorCuerpoExcedido();
  }

  const cuerpo = request.body;
  if (!cuerpo) return request.formData();

  // Conteo real byte a byte: es lo unico que no depende de lo que declare
  // quien llama. El flujo se corta en cuanto se pasa del tope, asi que la
  // memoria nunca crece mas alla del limite.
  let leidos = 0;
  const acotado = cuerpo.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(trozo, controlador) {
        leidos += trozo.byteLength;
        if (leidos > maximo) {
          controlador.error(new ErrorCuerpoExcedido());
          return;
        }
        controlador.enqueue(trozo);
      },
    }),
  );

  const acotada = new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: acotado,
    // Node exige declarar el flujo como half-duplex para enviarlo como cuerpo.
    duplex: "half",
  } as RequestInit & { duplex: "half" });

  try {
    return await acotada.formData();
  } catch (fallo) {
    // El error del flujo llega envuelto por el analizador del formulario.
    if (fallo instanceof ErrorCuerpoExcedido) throw fallo;
    if (fallo instanceof Error && fallo.cause instanceof ErrorCuerpoExcedido) {
      throw fallo.cause;
    }
    throw fallo;
  }
}
