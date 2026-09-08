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
  const punto = nombreArchivo.lastIndexOf(".");
  // `> 0` y no `>= 0`: un nombre que empieza por punto no tiene extension, lo
  // que tiene es un nombre oculto, y cortarlo dejaria la base vacia.
  const base = punto > 0 ? nombreArchivo.slice(0, punto) : nombreArchivo;
  return `${base}-w${ancho}.webp`;
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
 * Valor del atributo `srcset` de una imagen subida, con el original al final y
 * su ancho real como descriptor.
 *
 * Devuelve `undefined` —y entonces el `<img>` se queda como estaba, con solo su
 * `src`— en los tres casos en los que no hay nada que ofrecer:
 *
 *  · la URL no es de `/uploads/`: es un archivo del repositorio, sin variantes;
 *  · no se conoce el ancho del original (fila anterior a las columnas de
 *    medidas): sin el no se puede escribir un descriptor honesto;
 *  · el original es tan angosto que no hay ninguna variante mas chica que el.
 */
export function srcsetDe(
  url: string,
  anchoOriginal: number | null | undefined,
): string | undefined {
  if (!url.startsWith(PREFIJO_SUBIDAS)) return undefined;
  if (!anchoOriginal || anchoOriginal <= 0) return undefined;

  const anchos = anchosDisponibles(anchoOriginal);
  if (anchos.length === 0) return undefined;

  const archivo = url.slice(PREFIJO_SUBIDAS.length);
  const candidatos = anchos.map(
    (ancho) => `${PREFIJO_SUBIDAS}${archivoVariante(archivo, ancho)} ${ancho}w`,
  );
  candidatos.push(`${url} ${anchoOriginal}w`);
  return candidatos.join(", ");
}
