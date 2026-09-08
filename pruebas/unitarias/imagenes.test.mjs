// Pruebas unitarias de src/lib/imagenes.ts: las funciones que deciden QUE
// ARCHIVO se le ofrece al navegador en cada `<img>`.
//
// POR QUE ESTAS FUNCIONES SE PRUEBAN
// Un `srcset` mal armado no se ve mal, se ve ROTO: si nombra una variante que
// nadie genero, el navegador pide un archivo que da 404 y el hueco queda vacio
// justo en el ancho de pantalla mas comun. Y si el descriptor `w` no coincide
// con el ancho real del archivo, elige mal en silencio. Las dos cosas dependen
// solo de estas tres funciones puras.
//
//   pnpm test:unitarias

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ANCHOS_VARIANTE,
  anchosDisponibles,
  archivoVariante,
  nombreVariante,
  srcsetDe,
} from "../../src/lib/imagenes.ts";

// --- nombreVariante ---------------------------------------------------------

test("variante: cambia la extension por .webp y anade el ancho", () => {
  assert.equal(nombreVariante("/uploads/hero-123.png", 480), "/uploads/hero-123-w480.webp");
  assert.equal(nombreVariante("/uploads/tapa-9.jpeg", 1200), "/uploads/tapa-9-w1200.webp");
  // Un original que YA es WebP no es un caso especial: la variante se distingue
  // por el sufijo, no por la extension.
  assert.equal(nombreVariante("/uploads/foto.webp", 768), "/uploads/foto-w768.webp");
});

test("variante: las imagenes del repositorio no tienen variantes", () => {
  // Es el caso que impide publicar un srcset hacia archivos que no existen: lo
  // del repo nunca paso por sharp ni por el bucket.
  assert.equal(nombreVariante("/mock/hero-estudiantes-limpio.webp", 480), null);
  assert.equal(nombreVariante("/lineas/primaria-hero.jpg", 480), null);
  assert.equal(nombreVariante("https://otro.sitio/foto.jpg", 480), null);
});

test("variante: un nombre sin extension no se queda sin base", () => {
  assert.equal(nombreVariante("/uploads/portada", 480), "/uploads/portada-w480.webp");
  // Nombre oculto: el punto inicial NO es una extension.
  assert.equal(archivoVariante(".portada", 480), ".portada-w480.webp");
});

// --- anchosDisponibles ------------------------------------------------------

test("anchos: solo los ESTRICTAMENTE menores que el original", () => {
  assert.deepEqual(anchosDisponibles(1340), [480, 768, 1200]);
  assert.deepEqual(anchosDisponibles(600), [480]);
  assert.deepEqual(anchosDisponibles(400), []);
});

test("anchos: un original del tamano exacto de un escalon no lo repite", () => {
  // Una variante de 480 a partir de un original de 480 seria una copia.
  assert.deepEqual(anchosDisponibles(480), []);
  assert.deepEqual(anchosDisponibles(481), [480]);
});

test("anchos: un original enorme genera la lista completa", () => {
  assert.deepEqual(anchosDisponibles(4000), [...ANCHOS_VARIANTE]);
});

// --- srcsetDe ---------------------------------------------------------------

test("srcset: los descriptores son los anchos REALES de cada archivo", () => {
  assert.equal(
    srcsetDe("/uploads/hero-1.png", 1340),
    "/uploads/hero-1-w480.webp 480w, /uploads/hero-1-w768.webp 768w, " +
      "/uploads/hero-1-w1200.webp 1200w, /uploads/hero-1.png 1340w",
  );
});

test("srcset: el original va SIEMPRE al final y con su ancho de verdad", () => {
  const salida = srcsetDe("/uploads/tapa-7.jpg", 600);
  assert.equal(salida, "/uploads/tapa-7-w480.webp 480w, /uploads/tapa-7.jpg 600w");
  // Ningun descriptor puede nombrar un ancho que su archivo no tenga.
  assert.equal(salida?.includes("1200w"), false);
});

test("srcset: sin nada que ofrecer devuelve undefined y el <img> queda como estaba", () => {
  // 1. Imagen del repositorio: no hay variantes generadas.
  assert.equal(srcsetDe("/mock/laptop-smarti-limpio.webp", 1600), undefined);
  // 2. Ancho desconocido (fila anterior a las columnas de medidas).
  assert.equal(srcsetDe("/uploads/hero-1.png", null), undefined);
  assert.equal(srcsetDe("/uploads/hero-1.png", undefined), undefined);
  assert.equal(srcsetDe("/uploads/hero-1.png", 0), undefined);
  // 3. Original mas angosto que la variante mas chica: no hay opcion mejor.
  assert.equal(srcsetDe("/uploads/hero-1.png", 400), undefined);
});
