// Pruebas unitarias de src/lib/orden.ts
//
//   pnpm test:unitarias
//   node --experimental-strip-types --test "pruebas/unitarias/*.test.mjs"
//
// Este modulo lo comparte una decena de endpoints del panel: un fallo aqui no
// rompe una pantalla, las rompe todas a la vez. De ahi que sea el primero.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ORDEN_MAXIMO,
  ORDEN_MINIMO,
  calcularReordenamiento,
  leerEnteroAcotado,
  leerOrden,
} from "../../src/lib/orden.ts";

/** Lista de trabajo: los `orden` traen empates a proposito (ver mas abajo). */
function lista() {
  return [
    { id: "a", orden: 1 },
    { id: "b", orden: 1 },
    { id: "c", orden: 2 },
    { id: "d", orden: 2 },
    { id: "e", orden: 7 },
  ];
}

const ids = (resultado) => resultado.map((fila) => fila.id);

// calcularReordenamiento

test("el primero no puede subir", () => {
  assert.equal(calcularReordenamiento(lista(), "a", "subir"), null);
});

test("el ultimo no puede bajar", () => {
  assert.equal(calcularReordenamiento(lista(), "e", "bajar"), null);
});

test("un id que no esta en la lista devuelve null", () => {
  assert.equal(calcularReordenamiento(lista(), "z", "subir"), null);
  assert.equal(calcularReordenamiento(lista(), "z", "bajar"), null);
});

test("una lista vacia devuelve null", () => {
  assert.equal(calcularReordenamiento([], "a", "subir"), null);
});

test("una lista de un solo elemento no se mueve en ninguna direccion", () => {
  const sola = [{ id: "a", orden: 1 }];
  assert.equal(calcularReordenamiento(sola, "a", "subir"), null);
  assert.equal(calcularReordenamiento(sola, "a", "bajar"), null);
});

test("subir intercambia el elemento con el anterior", () => {
  const resultado = calcularReordenamiento(lista(), "c", "subir");
  assert.deepEqual(ids(resultado), ["a", "c", "b", "d", "e"]);
});

test("bajar intercambia el elemento con el siguiente", () => {
  const resultado = calcularReordenamiento(lista(), "c", "bajar");
  assert.deepEqual(ids(resultado), ["a", "b", "d", "c", "e"]);
});

// El caso que motivo la funcion: dos filas comparten `orden` porque el
// formulario propone el mismo valor por defecto. Intercambiar solo el numero las
// dejaria igual de empatadas y el movimiento no se veria en pantalla.
test("con empates en orden el movimiento igual se nota", () => {
  const conEmpate = [
    { id: "a", orden: 1 },
    { id: "b", orden: 1 },
    { id: "c", orden: 1 },
  ];
  assert.deepEqual(calcularReordenamiento(conEmpate, "c", "subir"), [
    { id: "a", orden: 1 },
    { id: "c", orden: 2 },
    { id: "b", orden: 3 },
  ]);
});

test("todos los elementos empatados en cero se renumeran igual", () => {
  const enCero = [
    { id: "a", orden: 0 },
    { id: "b", orden: 0 },
  ];
  assert.deepEqual(calcularReordenamiento(enCero, "a", "bajar"), [
    { id: "b", orden: 1 },
    { id: "a", orden: 2 },
  ]);
});

test("cualquier movimiento valido deja el orden consecutivo desde 1", () => {
  const original = lista();
  for (let indice = 0; indice < original.length; indice++) {
    for (const direccion of ["subir", "bajar"]) {
      const resultado = calcularReordenamiento(original, original[indice].id, direccion);
      if (resultado === null) continue;

      assert.deepEqual(
        resultado.map((fila) => fila.orden),
        [1, 2, 3, 4, 5],
        `mover ${original[indice].id} (${direccion}) no dejo el orden consecutivo`,
      );
      assert.deepEqual(
        [...ids(resultado)].sort(),
        ["a", "b", "c", "d", "e"],
        `mover ${original[indice].id} (${direccion}) perdio o duplico elementos`,
      );
    }
  }
});

test("no muta la lista recibida", () => {
  const original = lista();
  const copia = structuredClone(original);
  calcularReordenamiento(original, "c", "subir");
  assert.deepEqual(original, copia);
});

// leerEnteroAcotado

test("acepta los limites exactos del rango", () => {
  assert.equal(leerEnteroAcotado("0", ORDEN_MINIMO, ORDEN_MAXIMO), 0);
  assert.equal(leerEnteroAcotado("9999", ORDEN_MINIMO, ORDEN_MAXIMO), 9999);
});

test("rechaza el valor inmediatamente fuera de rango por arriba", () => {
  assert.equal(leerEnteroAcotado("10000", ORDEN_MINIMO, ORDEN_MAXIMO), null);
});

test("rechaza negativos", () => {
  assert.equal(leerEnteroAcotado("-1", ORDEN_MINIMO, ORDEN_MAXIMO), null);
  assert.equal(leerEnteroAcotado("-9999", ORDEN_MINIMO, ORDEN_MAXIMO), null);
});

test("rechaza la cadena vacia y los espacios", () => {
  assert.equal(leerEnteroAcotado("", ORDEN_MINIMO, ORDEN_MAXIMO), null);
  assert.equal(leerEnteroAcotado("   ", ORDEN_MINIMO, ORDEN_MAXIMO), null);
});

test("rechaza texto no numerico", () => {
  assert.equal(leerEnteroAcotado("abc", ORDEN_MINIMO, ORDEN_MAXIMO), null);
  assert.equal(leerEnteroAcotado("uno", ORDEN_MINIMO, ORDEN_MAXIMO), null);
  assert.equal(leerEnteroAcotado("NaN", ORDEN_MINIMO, ORDEN_MAXIMO), null);
});

// La razon de ser del techo: sin el, un numero mayor que el `Int` de Postgres
// pasaria la validacion y reventaria recien al escribir, con un 500 sin manejar.
test("rechaza un numero enorme antes de que llegue a la base", () => {
  assert.equal(leerEnteroAcotado("99999999999999999999", ORDEN_MINIMO, ORDEN_MAXIMO), null);
  assert.equal(leerEnteroAcotado("2147483647", ORDEN_MINIMO, ORDEN_MAXIMO), null);
});

// Queda anotado que `parseInt` corta en el primer caracter que no es digito, asi
// que "12abc" entra como 12 y "1e9" como 1. Es la lectura tolerante de siempre y
// el acotado la deja inofensiva; si algun dia se quisiera rechazar, este caso es
// el que tiene que ponerse rojo.
test("parseInt corta en el primer caracter no numerico", () => {
  assert.equal(leerEnteroAcotado("12abc", ORDEN_MINIMO, ORDEN_MAXIMO), 12);
  assert.equal(leerEnteroAcotado("1e9", ORDEN_MINIMO, ORDEN_MAXIMO), 1);
});

test("los espacios alrededor de un numero valido no molestan", () => {
  assert.equal(leerEnteroAcotado("  42  ", ORDEN_MINIMO, ORDEN_MAXIMO), 42);
});

test("un rango a medida se respeta igual", () => {
  assert.equal(leerEnteroAcotado("1900", 1900, 2100), 1900);
  assert.equal(leerEnteroAcotado("2100", 1900, 2100), 2100);
  assert.equal(leerEnteroAcotado("1899", 1900, 2100), null);
  assert.equal(leerEnteroAcotado("2101", 1900, 2100), null);
});

// leerOrden

/** FormData con los pares indicados. Sin pares equivale a un campo ausente. */
function formulario(pares = {}) {
  const datos = new FormData();
  for (const [clave, valor] of Object.entries(pares)) datos.set(clave, valor);
  return datos;
}

test("el campo ausente vale 0", () => {
  assert.equal(leerOrden(formulario()), 0);
});

test("el campo vacio vale 0", () => {
  assert.equal(leerOrden(formulario({ orden: "" })), 0);
  assert.equal(leerOrden(formulario({ orden: "   " })), 0);
});

test("lee el numero del formulario", () => {
  assert.equal(leerOrden(formulario({ orden: "0" })), 0);
  assert.equal(leerOrden(formulario({ orden: "12" })), 12);
  assert.equal(leerOrden(formulario({ orden: "9999" })), 9999);
});

test("rechaza lo que el formulario no deberia haber podido mandar", () => {
  assert.equal(leerOrden(formulario({ orden: "10000" })), null);
  assert.equal(leerOrden(formulario({ orden: "-1" })), null);
  assert.equal(leerOrden(formulario({ orden: "abc" })), null);
  assert.equal(leerOrden(formulario({ orden: "99999999999999999999" })), null);
});
