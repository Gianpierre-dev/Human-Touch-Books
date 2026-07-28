// Recorta los mocks entregados por el cliente para quitar los restos de
// tipografia de la maqueta original (texto quemado en el pixel que duplica o
// contradice el contenido HTML de la landing).
//
// Nunca sobrescribe el original: escribe una copia con sufijo "-limpio".
// Uso: node scripts/limpiar-mocks.mjs
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const MOCKS = join(RAIZ, "public", "mock");

/**
 * Cada recorte se midio sobre el PNG original (ver comentario de cada entrada).
 * `left` es el corte clave: los restos de tipografia siempre viven a la izquierda,
 * donde la maqueta original tenia la columna de texto.
 */
const RECORTES = [
  {
    origen: "hero-estudiantes.png",
    destino: "hero-estudiantes-limpio.png",
    // Original 600x336. Sobre el borde izquierdo asoman "…RT" (de TUTORIA SMART),
    // "…eración", "…ra" y un fragmento de boton. Todo termina antes de x=90.
    recorte: { left: 95, top: 0, width: 505, height: 336 },
  },
  {
    origen: "laptop-smarti.png",
    destino: "laptop-smarti-limpio.png",
    // Original 742x754. La franja izquierda repite en pixeles el titular, el
    // parrafo, dos de los chips ("Entorno seguro" y "Comunicacion eficiente") y
    // la nota de acceso. Ese bloque llega hasta x≈172 y el asistente SMARTI se
    // superpone hasta x≈265, asi que el unico corte limpio es a partir de 272.
    recorte: { left: 272, top: 28, width: 470, height: 712 },
  },
];

async function principal() {
  for (const { origen, destino, recorte } of RECORTES) {
    const rutaOrigen = join(MOCKS, origen);
    const rutaDestino = join(MOCKS, destino);

    const { width = 0, height = 0 } = await sharp(rutaOrigen).metadata();
    if (recorte.left + recorte.width > width || recorte.top + recorte.height > height) {
      throw new Error(`${origen}: el recorte se sale de la imagen (${width}x${height}).`);
    }

    await sharp(rutaOrigen)
      .extract(recorte)
      .png({ compressionLevel: 9 })
      .toFile(rutaDestino);

    console.log(
      `${relative(RAIZ, rutaOrigen)} ${width}x${height} → ` +
        `${relative(RAIZ, rutaDestino)} ${recorte.width}x${recorte.height}`,
    );
  }
}

await principal();
