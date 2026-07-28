// Optimiza las imagenes estaticas de public/ sobrescribiendo cada archivo con
// el mismo nombre: las URLs guardadas en la base de datos no cambian.
// Uso: node scripts/optimizar-portadas.mjs
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const PUBLICO = join(RAIZ, "public");

const GRUPOS = [
  { carpeta: join(PUBLICO, "covers"), extensiones: [".jpg", ".jpeg"], anchoMaximo: 800 },
  { carpeta: join(PUBLICO, "brand"), extensiones: [".png"], anchoMaximo: 512 },
  { carpeta: join(PUBLICO, "mock"), extensiones: [".png"], anchoMaximo: 1200 },
];

function enKb(bytes) {
  return `${(bytes / 1024).toFixed(0)} KB`;
}

async function optimizarArchivo(ruta, anchoMaximo) {
  const original = await readFile(ruta);
  const ext = extname(ruta).toLowerCase();
  const { width } = await sharp(original).metadata();

  if (!width || width <= anchoMaximo) {
    console.log(`  ${relative(PUBLICO, ruta)}: ${width ?? "?"} px — ya está dentro del límite`);
    return { antes: original.length, despues: original.length };
  }

  const canalizacion = sharp(original).rotate().resize({ width: anchoMaximo });
  const optimizada =
    ext === ".png"
      ? await canalizacion.png({ compressionLevel: 9 }).toBuffer()
      : await canalizacion.jpeg({ quality: 80, progressive: true, mozjpeg: true }).toBuffer();

  await writeFile(ruta, optimizada);
  const ahorro = (1 - optimizada.length / original.length) * 100;
  console.log(
    `  ${relative(PUBLICO, ruta)}: ${width} px ${enKb(original.length)} → ` +
      `${anchoMaximo} px ${enKb(optimizada.length)} (-${ahorro.toFixed(0)} %)`,
  );
  return { antes: original.length, despues: optimizada.length };
}

async function principal() {
  let totalAntes = 0;
  let totalDespues = 0;

  for (const { carpeta, extensiones, anchoMaximo } of GRUPOS) {
    let archivos;
    try {
      archivos = await readdir(carpeta);
    } catch {
      console.log(`\n${relative(PUBLICO, carpeta)}: carpeta no encontrada, se omite`);
      continue;
    }

    console.log(`\n${relative(PUBLICO, carpeta)} (máx. ${anchoMaximo} px):`);
    for (const archivo of archivos) {
      if (!extensiones.includes(extname(archivo).toLowerCase())) continue;
      const { antes, despues } = await optimizarArchivo(join(carpeta, archivo), anchoMaximo);
      totalAntes += antes;
      totalDespues += despues;
    }
  }

  const ahorro = totalAntes === 0 ? 0 : (1 - totalDespues / totalAntes) * 100;
  console.log(
    `\nTotal: ${enKb(totalAntes)} → ${enKb(totalDespues)} (-${ahorro.toFixed(0)} %)`,
  );
}

await principal();
