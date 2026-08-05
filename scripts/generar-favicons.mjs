// Genera los iconos cuadrados del sitio a partir de public/brand/logo.png
//
// Por que existe: el logo de marca es apaisado (512x317) y llevaba el rol de
// favicon tal cual. En una pestana de 16 o 32 px el logotipo completo — con la
// palabra "Human Touch Books" y el subtitulo "Editorial" — se convierte en una
// mancha ilegible.
//
// Solucion: recortar solo el isotipo (las letras HTB con la figura humana),
// que es la parte reconocible de la marca, y centrarlo en un lienzo cuadrado
// con fondo blanco. El isotipo es azul degradado sobre transparente, asi que
// necesita una superficie clara para leerse en pestanas de tema oscuro.
//
// Salidas:
//   public/brand/icono-512.png       — favicon de alta resolucion
//   public/brand/icono-apple-180.png — apple-touch-icon (iOS no admite alfa)
//
// Uso: node scripts/generar-favicons.mjs
import { stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const ORIGEN = join(RAIZ, "public", "brand", "logo.png");

const SALIDAS = [
  { archivo: "icono-512.png", lado: 512 },
  { archivo: "icono-apple-180.png", lado: 180 },
];

// Margen interior: iOS recorta las esquinas del apple-touch-icon, y un icono
// que toca los bordes se lee apretado en la pestana.
const MARGEN = 0.1;

/**
 * Caja del isotipo dentro del logo.
 *
 * No se codifica a mano: se detecta el azul de marca (canal B alto y claramente
 * por encima del R) en la mitad inferior de la imagen, que es donde vive el
 * isotipo. Asi el script sigue siendo correcto si el logo se re-exporta con
 * otro encuadre.
 */
async function cajaDelIsotipo() {
  const { data, info } = await sharp(ORIGEN)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  let izquierda = width;
  let derecha = -1;
  let arriba = height;
  let abajo = -1;

  for (let y = Math.floor(height * 0.35); y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      if (data[i + 3] < 40) continue; // transparente
      const azulDeMarca = data[i + 2] > 110 && data[i + 2] - data[i] > 45;
      if (!azulDeMarca) continue;
      if (x < izquierda) izquierda = x;
      if (x > derecha) derecha = x;
      if (y < arriba) arriba = y;
      if (y > abajo) abajo = y;
    }
  }

  if (derecha < 0) throw new Error("No se encontro el isotipo azul dentro del logo.");

  return {
    left: izquierda,
    top: arriba,
    width: derecha - izquierda + 1,
    height: abajo - arriba + 1,
  };
}

async function principal() {
  const caja = await cajaDelIsotipo();
  const isotipo = await sharp(ORIGEN).extract(caja).png().toBuffer();

  for (const { archivo, lado } of SALIDAS) {
    const util = Math.round(lado * (1 - MARGEN * 2));
    // `contain` sobre lienzo transparente: preserva la proporcion del isotipo
    // (es mas ancho que alto) en vez de deformarlo hasta el cuadrado.
    const encajado = await sharp(isotipo)
      .resize(util, util, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    const salida = join(RAIZ, "public", "brand", archivo);
    await sharp({
      create: { width: lado, height: lado, channels: 4, background: "#ffffff" },
    })
      .composite([
        { input: encajado, left: Math.round(lado * MARGEN), top: Math.round(lado * MARGEN) },
      ])
      .png({ compressionLevel: 9 })
      .toFile(salida);

    const { size } = await stat(salida);
    console.log(`${relative(RAIZ, salida)} — ${lado}x${lado}, ${(size / 1024).toFixed(1)} KB`);
  }

  console.log(
    `isotipo recortado del logo: ${caja.width}x${caja.height} en (${caja.left}, ${caja.top})`,
  );
}

await principal();
