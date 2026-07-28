// Genera la imagen social (Open Graph) de la landing: public/og/portada-social.jpg
//
// Composicion: fondo navy de marca + placa blanca con el logotipo (el logo es
// tinta navy sobre transparente, asi que necesita una superficie clara para
// leerse) + tres portadas de la coleccion escalonadas a la derecha.
// No se dibuja texto: las tipografias de marca no estan instaladas en el sistema
// y el titular ya viaja en las etiquetas og:title / og:description.
//
// Uso: node scripts/generar-og.mjs
import { mkdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const PUBLICO = join(RAIZ, "public");
const SALIDA = join(PUBLICO, "og", "portada-social.jpg");

const ANCHO = 1200;
const ALTO = 630;
const NAVY = "#0a2550";

const PORTADAS = ["smart-1.jpg", "smart-3.jpg", "smart-5.jpg"];

/** Portada: alto fijo, ancho derivado del aspecto real de los JPG (800x991). */
const ALTO_PORTADA = 336;
const ANCHO_PORTADA = Math.round(ALTO_PORTADA * (800 / 991));
const RADIO_PORTADA = 10;
const BORDE_PORTADA = 3; // filo blanco: separa las portadas cuando se solapan

/**
 * Trio en abanico: se solapan porque tres portadas completas no entran con
 * margenes dignos. El paso deja legible el titulo de las tres; el numero de
 * grado completo solo se ve en la ultima (las demas quedan bajo el solape).
 */
const IZQUIERDA_PORTADAS = 452;
const PASO_PORTADAS = 215;
const TOPES_PORTADAS = [155, 133, 155];

const PLACA = { left: 80, top: 215, width: 352, height: 200, radio: 22 };
const ANCHO_LOGO = 276;

function svg(contenido) {
  return Buffer.from(contenido);
}

/** Portada con esquinas redondeadas y un filo blanco alrededor. */
async function portadaConFilo(ruta) {
  const mascara = svg(
    `<svg width="${ANCHO_PORTADA}" height="${ALTO_PORTADA}"><rect width="${ANCHO_PORTADA}" height="${ALTO_PORTADA}" rx="${RADIO_PORTADA}" ry="${RADIO_PORTADA}" fill="#fff"/></svg>`,
  );
  const portada = await sharp(ruta)
    .resize(ANCHO_PORTADA, ALTO_PORTADA, { fit: "cover" })
    .composite([{ input: mascara, blend: "dest-in" }])
    .png()
    .toBuffer();

  const anchoFilo = ANCHO_PORTADA + BORDE_PORTADA * 2;
  const altoFilo = ALTO_PORTADA + BORDE_PORTADA * 2;
  const filo = svg(
    `<svg width="${anchoFilo}" height="${altoFilo}"><rect width="${anchoFilo}" height="${altoFilo}" rx="${RADIO_PORTADA + BORDE_PORTADA}" ry="${RADIO_PORTADA + BORDE_PORTADA}" fill="#ffffff"/></svg>`,
  );

  return sharp(filo)
    .composite([{ input: portada, left: BORDE_PORTADA, top: BORDE_PORTADA }])
    .png()
    .toBuffer();
}

async function principal() {
  await mkdir(join(PUBLICO, "og"), { recursive: true });

  // Fondo: navy plano + los mismos halos radiales del hero.
  const fondo = svg(`
    <svg width="${ANCHO}" height="${ALTO}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="halo1" cx="88%" cy="4%" r="62%">
          <stop offset="0%" stop-color="#1e6fd9" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="#1e6fd9" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="halo2" cx="4%" cy="96%" r="52%">
          <stop offset="0%" stop-color="#35a3f5" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="#35a3f5" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="${ANCHO}" height="${ALTO}" fill="${NAVY}"/>
      <rect width="${ANCHO}" height="${ALTO}" fill="url(#halo1)"/>
      <rect width="${ANCHO}" height="${ALTO}" fill="url(#halo2)"/>
      <rect x="0" y="${ALTO - 10}" width="${ANCHO}" height="10" fill="#35a3f5"/>
    </svg>
  `);

  const placa = svg(
    `<svg width="${PLACA.width}" height="${PLACA.height}"><rect width="${PLACA.width}" height="${PLACA.height}" rx="${PLACA.radio}" ry="${PLACA.radio}" fill="#ffffff"/></svg>`,
  );

  const logo = await sharp(join(PUBLICO, "brand", "logo.png"))
    .resize({ width: ANCHO_LOGO })
    .png()
    .toBuffer();
  const { height: altoLogo = 0 } = await sharp(logo).metadata();

  const capas = [
    { input: placa, left: PLACA.left, top: PLACA.top },
    {
      input: logo,
      left: PLACA.left + Math.round((PLACA.width - ANCHO_LOGO) / 2),
      top: PLACA.top + Math.round((PLACA.height - altoLogo) / 2),
    },
  ];

  for (const [i, archivo] of PORTADAS.entries()) {
    const left = IZQUIERDA_PORTADAS + PASO_PORTADAS * i;
    if (left + ANCHO_PORTADA + BORDE_PORTADA * 2 > ANCHO) {
      throw new Error(`La portada ${archivo} se sale del lienzo (${left + ANCHO_PORTADA} px).`);
    }
    capas.push({
      input: await portadaConFilo(join(PUBLICO, "covers", archivo)),
      left,
      top: TOPES_PORTADAS[i],
    });
  }

  await sharp(fondo)
    .composite(capas)
    .jpeg({ quality: 88, progressive: true, mozjpeg: true })
    .toFile(SALIDA);

  const { size } = await stat(SALIDA);
  console.log(`${relative(RAIZ, SALIDA)} — ${ANCHO}x${ALTO}, ${(size / 1024).toFixed(0)} KB`);
}

await principal();
