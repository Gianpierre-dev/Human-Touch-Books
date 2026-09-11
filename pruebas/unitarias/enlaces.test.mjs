// Pruebas unitarias de `esEnlaceSeguro` (src/lib/textos.ts)
//
//   pnpm test:unitarias
//
// Es la unica barrera entre lo que alguien escribe en /admin/textos y un
// `href` que aparece en TODAS las paginas publicas (el boton «Solicitar
// acceso» del header) y en la tarjeta del hero. Si deja pasar un esquema
// peligroso o un destino que el navegador reinterpreta, el sitio entero
// termina enlazando fuera de su dominio.

import { test } from "node:test";
import assert from "node:assert/strict";

import { esEnlaceSeguro } from "../../src/lib/textos.ts";

test("acepta ruta interna, ancla y https completo", () => {
  for (const valor of ["/nosotros/quienes-somos", "/", "#contacto", "https://ejemplo.pe/acceso"]) {
    assert.equal(esEnlaceSeguro(valor), true, valor);
  }
});

test("rechaza esquemas peligrosos o sin cifrar", () => {
  for (const valor of [
    "javascript:alert(1)",
    "data:text/html,<b>x</b>",
    "http://ejemplo.pe",
    "ftp://ejemplo.pe",
    "mailto:a@b.pe",
  ]) {
    assert.equal(esEnlaceSeguro(valor), false, valor);
  }
});

test("rechaza lo que el navegador convierte en otro dominio", () => {
  // «//otro.com» es relativo al protocolo: sale del sitio.
  assert.equal(esEnlaceSeguro("//otro.com"), false);
  // El navegador lee «\» como «/»: «/\otro.com» termina siendo «//otro.com».
  assert.equal(esEnlaceSeguro("/\\otro.com"), false);
  // Quita tabuladores y saltos de linea: «/<tab>/otro.com» tambien.
  assert.equal(esEnlaceSeguro("/\t/otro.com"), false);
  assert.equal(esEnlaceSeguro("/\n/otro.com"), false);
});

test("rechaza espacios y un ancla vacia", () => {
  assert.equal(esEnlaceSeguro(" https://ejemplo.pe"), false);
  assert.equal(esEnlaceSeguro("https://ejemplo.pe/a b"), false);
  assert.equal(esEnlaceSeguro("#"), false);
});
