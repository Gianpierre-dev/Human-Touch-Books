// Pruebas unitarias de src/lib/contraste.ts
//
//   pnpm test:unitarias
//   node --experimental-strip-types --test "pruebas/unitarias/*.test.mjs"
//
// `sirveConBlanco` es la unica barrera entre el color que el cliente elige en el
// panel y una pagina de linea ilegible. Los dos modos de fallar son simetricos y
// los dos estan cubiertos aqui: aprobar un color que no llega al 4,5:1, y
// aprobar un hex invalido porque el `null` se colo como si fuera un numero.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CONTRASTE_MINIMO,
  contrasteConBlanco,
  luminanciaRelativa,
  razonDeContraste,
  sirveConBlanco,
} from "../../src/lib/contraste.ts";

const BLANCO = "#ffffff";
const NEGRO = "#000000";

/** Hex invalidos que el panel podria recibir por formulario o por la base. */
const HEX_INVALIDOS = [
  "",
  "   ",
  "fff",
  "#fff",
  "ffffff",
  "#fffff",
  "#fffffff",
  "#gggggg",
  "#ff ffff",
  "rojo",
  "rgb(0,0,0)",
  "#ffffff ",
  " #ffffff",
];

test("blanco contra blanco da 1:1", () => {
  assert.equal(razonDeContraste(BLANCO, BLANCO), 1);
  assert.equal(contrasteConBlanco(BLANCO), 1);
});

test("el blanco se rechaza: no se ve sobre si mismo", () => {
  assert.equal(sirveConBlanco(BLANCO), false);
  assert.equal(sirveConBlanco("#FFFFFF"), false);
});

test("negro contra blanco da 21:1", () => {
  assert.equal(razonDeContraste(NEGRO, BLANCO), 21);
  assert.equal(contrasteConBlanco(NEGRO), 21);
  assert.equal(sirveConBlanco(NEGRO), true);
});

test("la razon es simetrica: da igual cual sea el fondo", () => {
  assert.equal(razonDeContraste(NEGRO, BLANCO), razonDeContraste(BLANCO, NEGRO));
  assert.equal(razonDeContraste("#1d4ed8", "#f5f5f5"), razonDeContraste("#f5f5f5", "#1d4ed8"));
});

test("la luminancia va de 0 en negro a 1 en blanco", () => {
  assert.equal(luminanciaRelativa(NEGRO), 0);
  assert.equal(luminanciaRelativa(BLANCO), 1);
});

test("el hex no distingue mayusculas de minusculas", () => {
  assert.equal(contrasteConBlanco("#1D4ED8"), contrasteConBlanco("#1d4ed8"));
});

// El par que rodea el umbral. #767676 llega a 4,54:1 y #777777 se queda en
// 4,48:1: un solo escalon de gris separa aprobado de rechazado, y es justo donde
// una comparacion mal puesta (`>` en vez de `>=`, redondeo previo) se rompe.
test("un color justo por encima del umbral pasa", () => {
  const contraste = contrasteConBlanco("#767676");
  assert.ok(contraste >= CONTRASTE_MINIMO, `#767676 dio ${contraste}`);
  assert.equal(sirveConBlanco("#767676"), true);
});

test("un color justo por debajo del umbral se rechaza", () => {
  const contraste = contrasteConBlanco("#777777");
  assert.ok(contraste < CONTRASTE_MINIMO, `#777777 dio ${contraste}`);
  assert.equal(sirveConBlanco("#777777"), false);
});

test("los colores de marca habituales pasan el umbral", () => {
  for (const hex of ["#1d4ed8", "#0000ff", "#008000", "#7c2d12"]) {
    assert.equal(sirveConBlanco(hex), true, `${hex} no llego al ${CONTRASTE_MINIMO}:1`);
  }
});

test("los pasteles no pasan por mas que se vean bien en un fondo oscuro", () => {
  for (const hex of ["#ffff00", "#00ff00", "#93c5fd", "#fca5a5"]) {
    assert.equal(sirveConBlanco(hex), false, `${hex} se colo por debajo del umbral`);
  }
});

test("un hex invalido no tiene luminancia ni contraste", () => {
  for (const hex of HEX_INVALIDOS) {
    assert.equal(luminanciaRelativa(hex), null, `${hex} devolvio luminancia`);
    assert.equal(razonDeContraste(hex, BLANCO), null, `${hex} devolvio contraste`);
    assert.equal(razonDeContraste(BLANCO, hex), null, `${hex} devolvio contraste como segundo`);
    assert.equal(contrasteConBlanco(hex), null, `${hex} devolvio contraste con blanco`);
  }
});

// El fallo silencioso que hay que evitar: `null >= 4.5` es `false`, pero
// `null > 0` es `true`. Si la comparacion se escribiera al reves, un hex basura
// entraria como color aprobado y la pagina saldria en negro sobre negro.
test("el null de un hex invalido NO se cuela como aprobado", () => {
  for (const hex of HEX_INVALIDOS) {
    assert.equal(sirveConBlanco(hex), false, `${hex} paso como color valido`);
  }
});
