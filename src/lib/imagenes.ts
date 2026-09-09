// Variantes responsivas de las imagenes subidas desde el panel.
//
// POR QUE EXISTE ESTE MODULO
// Cada `<img>` del sitio servia UN solo archivo, el mismo para todos: a un
// celular de 360 px se le mandaba el hero de 1736 px en PNG (1,96 MB medidos) y
// la foto de Plataforma (1,18 MB) para pintarlas a menos de la mitad de ancho.
// El navegador sabe elegir el archivo del tamano justo, pero solo si se le dan
// las opciones: eso es el `srcset`.
//
// LA REGLA QUE NO SE PUEDE ROMPER
// Cada descriptor `w` tiene que ser el ancho REAL del archivo al que apunta. Un
// `srcset` que promete un ancho que el archivo no tiene hace que el navegador
// elija mal (sirve de mas o de menos, y con `sizes` calcula sobre una mentira);
// uno que apunta a un archivo inexistente rompe la imagen entera, no la degrada.
// Por eso los nombres de variante se derivan SIEMPRE de aqui —tanto al
// generarlas (src/lib/almacen.ts) como al escribirlas en el HTML— y los anchos
// se filtran contra el ancho real del original guardado en la base de datos.
//
// Funciones puras, sin E/S: se pueden probar con `pnpm test:unitarias`.

/** Prefijo de las imagenes que sirve el bucket (src/pages/uploads/[...ruta].ts). */
const PREFIJO_SUBIDAS = "/uploads/";

/**
 * Anchos de las variantes que se generan por cada imagen subida.
 *
 * Cubren el recorrido real del sitio: 480 para un celular pintando a ancho
 * completo, 768 para tablet, 1200 para una columna de escritorio y 1920 para el
 * hero a pantalla completa en un monitor grande. Mas escalones no cambiarian el
 * archivo elegido y multiplicarian el trabajo de sharp y los objetos del bucket.
 */
export const ANCHOS_VARIANTE = [480, 768, 1200, 1920] as const;

/**
 * Nombre de archivo de una variante: `hero-123.png` + 480 → `hero-123-w480.webp`.
 *
 * Siempre WebP, sea cual sea el formato del original: es el unico punto donde el
 * formato cambia, y por eso la extension se reemplaza en vez de anadirse.
 */
export function archivoVariante(nombreArchivo: string, ancho: number): string {
  return `${prefijoVariantes(nombreArchivo)}${ancho}.webp`;
}

/**
 * Prefijo comun a TODAS las variantes de un archivo: `hero-123.png` →
 * `hero-123-w`. Es lo que permite borrarlas listando el bucket por prefijo, sin
 * saber que anchos se generaron (uno de ellos, el del original, es distinto
 * para cada imagen). No puede pisar a otra imagen: los nombres subidos son
 * `<ranura>-<marca de tiempo>.<ext>`, y tras la marca de tiempo nunca sigue
 * `-w`.
 */
export function prefijoVariantes(nombreArchivo: string): string {
  const punto = nombreArchivo.lastIndexOf(".");
  // `> 0` y no `>= 0`: un nombre que empieza por punto no tiene extension, lo
  // que tiene es un nombre oculto, y cortarlo dejaria la base vacia.
  const base = punto > 0 ? nombreArchivo.slice(0, punto) : nombreArchivo;
  return `${base}-w`;
}

/**
 * URL publica de una variante, o `null` si la URL no es de una imagen subida.
 *
 * Las imagenes del repositorio (`/mock/...`, `/lineas/...`) no tienen variantes:
 * no pasan por el bucket y nadie las genero. Devolver `null` en vez de inventar
 * un nombre es lo que impide publicar un `srcset` hacia archivos que no existen.
 */
export function nombreVariante(url: string, ancho: number): string | null {
  if (!url.startsWith(PREFIJO_SUBIDAS)) return null;
  return PREFIJO_SUBIDAS + archivoVariante(url.slice(PREFIJO_SUBIDAS.length), ancho);
}

/**
 * Anchos de variante que tiene sentido generar para un original de este ancho.
 *
 * ESTRICTAMENTE menores: agrandar una imagen no anade detalle, solo peso, y una
 * variante del mismo ancho que el original seria una copia. Un original de
 * 1340 px da [480, 768, 1200]; uno de 600, [480]; uno de 400, ninguna.
 */
export function anchosDisponibles(anchoOriginal: number): number[] {
  return ANCHOS_VARIANTE.filter((ancho) => ancho < anchoOriginal);
}

/**
 * Todos los anchos que se generan para un original: los escalones mas angostos
 * MAS el ancho exacto del original, siempre.
 *
 * POR QUE TAMBIEN EL ANCHO COMPLETO
 * Sin el, en escritorio el unico candidato que cubre la pantalla era el
 * original tal cual se subio: tres heroes en PNG de 2 a 2,6 MB cada uno, 6,6 MB
 * medidos a 1440px. Re-codificar el original en WebP al mismo ancho baja eso
 * ~10 veces con el mismo descriptor honesto. El original queda solo como `src`
 * de respaldo para un navegador sin `srcset`.
 */
export function anchosAGenerar(anchoOriginal: number): number[] {
  return [...anchosDisponibles(anchoOriginal), anchoOriginal];
}

/**
 * Valor del atributo `srcset` de una imagen subida: solo variantes WebP, la
 * ultima al ancho exacto del original.
 *
 * Devuelve `undefined` —y entonces el `<img>` se queda como estaba, con solo su
 * `src`— cuando no hay nada honesto que ofrecer:
 *
 *  · la URL no es de `/uploads/`: es un archivo del repositorio, sin variantes;
 *  · no se conoce el ancho del original (fila anterior a las columnas de
 *    medidas): sin el no se puede escribir un descriptor honesto.
 *
 * Un original mas angosto que el escalon mas chico SI tiene srcset: su unica
 * variante es el WebP a ancho completo, que igual pesa mucho menos que el PNG.
 */
export function srcsetDe(
  url: string,
  anchoOriginal: number | null | undefined,
): string | undefined {
  if (!url.startsWith(PREFIJO_SUBIDAS)) return undefined;
  if (!anchoOriginal || anchoOriginal <= 0) return undefined;

  const archivo = url.slice(PREFIJO_SUBIDAS.length);
  return anchosAGenerar(anchoOriginal)
    .map((ancho) => `${PREFIJO_SUBIDAS}${archivoVariante(archivo, ancho)} ${ancho}w`)
    .join(", ");
}
