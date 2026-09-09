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
  anchosAGenerar,
  anchosDisponibles,
  archivoVariante,
  nombreVariante,
  prefijoVariantes,
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

test("anchos a generar: los escalones menores MAS el ancho exacto del original", () => {
  assert.deepEqual(anchosAGenerar(1340), [480, 768, 1200, 1340]);
  assert.deepEqual(anchosAGenerar(600), [480, 600]);
  // Un original angosto igual tiene su WebP a ancho completo: pesa mucho menos
  // que el PNG y es lo unico que cubre la pantalla en escritorio.
  assert.deepEqual(anchosAGenerar(400), [400]);
});

// --- prefijoVariantes -------------------------------------------------------

test("prefijo: es lo que comparten todas las variantes y ninguna otra imagen", () => {
  assert.equal(prefijoVariantes("hero-1788802685683.png"), "hero-1788802685683-w");
  // Otra imagen con la misma ranura tiene otra marca de tiempo: no empieza asi.
  assert.equal(
    "hero-1788810012798.png".startsWith(prefijoVariantes("hero-1788802685683.png")),
    false,
  );
  // Toda variante generada empieza por el prefijo de su original.
  for (const ancho of anchosAGenerar(1736)) {
    assert.ok(archivoVariante("hero-1.png", ancho).startsWith(prefijoVariantes("hero-1.png")));
  }
});

// --- srcsetDe ---------------------------------------------------------------

test("srcset: los descriptores son los anchos REALES de cada archivo", () => {
  assert.equal(
    srcsetDe("/uploads/hero-1.png", 1340),
    "/uploads/hero-1-w480.webp 480w, /uploads/hero-1-w768.webp 768w, " +
      "/uploads/hero-1-w1200.webp 1200w, /uploads/hero-1-w1340.webp 1340w",
  );
});

test("srcset: el ultimo candidato es el WebP a ancho completo, nunca el PNG original", () => {
  const salida = srcsetDe("/uploads/tapa-7.jpg", 600);
  assert.equal(salida, "/uploads/tapa-7-w480.webp 480w, /uploads/tapa-7-w600.webp 600w");
  // El original queda solo como `src` de respaldo: no aparece en el srcset.
  assert.equal(salida?.includes("tapa-7.jpg"), false);
  // Ningun descriptor puede nombrar un ancho que su archivo no tenga.
  assert.equal(salida?.includes("1200w"), false);
});

test("srcset: un original mas angosto que el escalon minimo ofrece solo su WebP", () => {
  assert.equal(srcsetDe("/uploads/hero-1.png", 400), "/uploads/hero-1-w400.webp 400w");
});

test("srcset: sin nada honesto que ofrecer devuelve undefined y el <img> queda como estaba", () => {
  // 1. Imagen del repositorio: no hay variantes generadas.
  assert.equal(srcsetDe("/mock/laptop-smarti-limpio.webp", 1600), undefined);
  // 2. Ancho desconocido (fila anterior a las columnas de medidas).
  assert.equal(srcsetDe("/uploads/hero-1.png", null), undefined);
  assert.equal(srcsetDe("/uploads/hero-1.png", undefined), undefined);
  assert.equal(srcsetDe("/uploads/hero-1.png", 0), undefined);
});
