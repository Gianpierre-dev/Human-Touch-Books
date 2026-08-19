// Pruebas unitarias de `resolverTextos` (src/lib/textos.ts)
//
//   pnpm test:unitarias
//   node --experimental-strip-types --test "pruebas/unitarias/*.test.mjs"
//
// Resuelve el copy de TODA la landing en una sola pasada. Si devolviera una
// clave de menos, la pagina publica renderiza un hueco en blanco; si dejara
// pasar una clave vieja de la base, el catalogo del codigo deja de mandar.

import { test } from "node:test";
import assert from "node:assert/strict";

import { CAMPOS_TEXTO, resolverTextos, valorPorDefecto } from "../../src/lib/textos.ts";

const CONTEXTO = {
  descripcionColeccion: "Serie de prueba. Un texto por grado, de 1° a 6°.",
};

/** Las claves cuyo defecto se calcula con datos administrables. */
const CLAVES_CALCULADAS = CAMPOS_TEXTO.filter((campo) => typeof campo.defecto === "function").map(
  (campo) => campo.clave,
);

test("sin filas guardadas devuelve todos los valores por defecto", () => {
  const resueltos = resolverTextos([], CONTEXTO);

  assert.equal(Object.keys(resueltos).length, CAMPOS_TEXTO.length);
  for (const campo of CAMPOS_TEXTO) {
    assert.equal(
      resueltos[campo.clave],
      valorPorDefecto(campo, CONTEXTO),
      `${campo.clave} no cayo en su valor por defecto`,
    );
  }
});

test("ninguna clave del catalogo queda sin resolver", () => {
  const resueltos = resolverTextos([{ clave: "portada_insignia", valor: "Novedad" }], CONTEXTO);

  for (const campo of CAMPOS_TEXTO) {
    assert.equal(typeof resueltos[campo.clave], "string", `${campo.clave} no es texto`);
  }
});

test("el valor guardado le gana al valor por defecto", () => {
  const resueltos = resolverTextos(
    [
      { clave: "portada_titulo_1", valor: "TUTORÍA SMART" },
      { clave: "portada_titulo_2", valor: "2028" },
    ],
    CONTEXTO,
  );

  assert.equal(resueltos.portada_titulo_2, "2028");
});

// La regla del modulo: vaciar el campo borra la fila. Pero si una fila vacia
// llegara igual (una version anterior, una carga manual), gana sobre el defecto:
// queda anotado porque es la diferencia entre "no hay fila" y "hay fila vacia".
test("una fila con texto vacio se respeta tal cual", () => {
  const resueltos = resolverTextos([{ clave: "portada_insignia", valor: "" }], CONTEXTO);
  assert.equal(resueltos.portada_insignia, "");
});

test("las claves que ya no estan en el catalogo se ignoran", () => {
  const resueltos = resolverTextos(
    [
      { clave: "hero_subtitulo_viejo", valor: "resto de una version anterior" },
      { clave: "seccion_borrada", valor: "otro resto" },
      { clave: "portada_insignia", valor: "Novedad" },
    ],
    CONTEXTO,
  );

  assert.equal(Object.keys(resueltos).length, CAMPOS_TEXTO.length);
  assert.equal(Object.hasOwn(resueltos, "hero_subtitulo_viejo"), false);
  assert.equal(Object.hasOwn(resueltos, "seccion_borrada"), false);
  assert.equal(resueltos.portada_insignia, "Novedad");
});

// Una clave inventada que coincidiera con algo del prototipo de Object no debe
// filtrarse: el resolver arma el resultado recorriendo el catalogo, no las filas.
test("una clave del prototipo de Object no contamina el resultado", () => {
  const resueltos = resolverTextos([{ clave: "toString", valor: "roto" }], CONTEXTO);
  assert.equal(Object.hasOwn(resueltos, "toString"), false);
});

test("un defecto calculado se resuelve con el contexto recibido", () => {
  assert.ok(CLAVES_CALCULADAS.length > 0, "el catalogo ya no tiene defectos calculados");

  const resueltos = resolverTextos([], CONTEXTO);
  assert.equal(resueltos.coleccion_descripcion, CONTEXTO.descripcionColeccion);
});

test("el defecto calculado cambia cuando cambia el contexto", () => {
  const otro = { descripcionColeccion: "Otra serie. Un texto por grado, de 1° a 3°." };
  assert.equal(resolverTextos([], otro).coleccion_descripcion, otro.descripcionColeccion);
});

test("el valor guardado le gana tambien al defecto calculado", () => {
  const resueltos = resolverTextos(
    [{ clave: "coleccion_descripcion", valor: "Descripción escrita a mano." }],
    CONTEXTO,
  );

  assert.equal(resueltos.coleccion_descripcion, "Descripción escrita a mano.");
});

test("no hay claves repetidas en el catalogo", () => {
  const claves = CAMPOS_TEXTO.map((campo) => campo.clave);
  assert.equal(new Set(claves).size, claves.length);
});
