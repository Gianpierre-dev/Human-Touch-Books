// Pruebas unitarias de src/lib/borrador.ts
//
//   pnpm test:unitarias
//
// El borrador devuelve al formulario lo que la persona acababa de escribir
// cuando el servidor rechaza el envio. Dos propiedades no son negociables y por
// eso tienen prueba propia:
//   1. Una CONTRASENA nunca se guarda, aunque quien llame se olvide de excluirla.
//   2. El borrador de una fila no puede repoblar el formulario de otra.

import { test } from "node:test";
import assert from "node:assert/strict";

import { guardarBorrador, leerBorrador } from "../../src/lib/borrador.ts";

/** Doble de las cookies de Astro: guarda en memoria lo que se le pide. */
function cookiesFalsas(inicial = {}) {
  const almacen = new Map(Object.entries(inicial));
  return {
    almacen,
    set(nombre, valor, opciones) {
      almacen.set(nombre, { valor, opciones });
    },
    get(nombre) {
      const fila = almacen.get(nombre);
      if (!fila) return undefined;
      return { value: fila.valor, json: () => JSON.parse(fila.valor) };
    },
    delete(nombre) {
      almacen.delete(nombre);
    },
  };
}

function formulario(campos) {
  const datos = new FormData();
  for (const [clave, valor] of Object.entries(campos)) datos.set(clave, valor);
  return datos;
}

const OPCIONES = { nombre: "borrador_prueba", ruta: "/admin/prueba" };

test("guarda los campos de texto y los devuelve tal cual", () => {
  const cookies = cookiesFalsas();
  guardarBorrador({ cookies, ...OPCIONES }, formulario({ titulo: "Mi título", orden: "5" }));

  const leido = leerBorrador(cookies, OPCIONES.nombre, OPCIONES.ruta);
  assert.equal(leido.titulo, "Mi título");
  assert.equal(leido.orden, "5");
});

test("NUNCA guarda una contrasena, aunque venga en el formulario", () => {
  const cookies = cookiesFalsas();
  guardarBorrador(
    { cookies, ...OPCIONES },
    formulario({
      correo: "admin@htb.pe",
      clave: "secreta-de-verdad",
      clave_actual: "otra-secreta",
      clave_nueva: "la-nueva",
      contrasena: "y-otra-mas",
    }),
  );

  const crudo = cookies.get(OPCIONES.nombre).value;
  for (const secreto of ["secreta-de-verdad", "otra-secreta", "la-nueva", "y-otra-mas"]) {
    assert.ok(!crudo.includes(secreto), `la cookie se llevo ${secreto}`);
  }

  const leido = leerBorrador(cookies, OPCIONES.nombre, OPCIONES.ruta);
  assert.equal(leido.correo, "admin@htb.pe", "el correo si tiene que volver");
  assert.equal(leido.clave, undefined);
  assert.equal(leido.clave_nueva, undefined);
});

test("la accion del formulario no es un dato y no viaja", () => {
  const cookies = cookiesFalsas();
  guardarBorrador({ cookies, ...OPCIONES }, formulario({ _accion: "eliminar", titulo: "X" }));
  const leido = leerBorrador(cookies, OPCIONES.nombre, OPCIONES.ruta);
  assert.equal(leido._accion, undefined);
  assert.equal(leido.titulo, "X");
});

test("es de UN SOLO USO: al leerlo se borra", () => {
  const cookies = cookiesFalsas();
  guardarBorrador({ cookies, ...OPCIONES }, formulario({ titulo: "Una vez" }));

  assert.equal(leerBorrador(cookies, OPCIONES.nombre, OPCIONES.ruta).titulo, "Una vez");
  // La segunda vez ya no hay nada: si sobreviviera, pisaria el formulario la
  // proxima vez que se entrara limpio a esa pantalla.
  assert.deepEqual(leerBorrador(cookies, OPCIONES.nombre, OPCIONES.ruta), {});
});

test("el borrador de OTRA fila no repuebla este formulario", () => {
  const cookies = cookiesFalsas();
  guardarBorrador({ cookies, ...OPCIONES, id: "libro-1" }, formulario({ titulo: "Del libro 1" }));

  // La ficha del libro 2 lo ignora...
  assert.deepEqual(leerBorrador(cookies, OPCIONES.nombre, OPCIONES.ruta, "libro-2"), {});
});

test("el borrador de un ALTA no repuebla la ficha de una fila existente", () => {
  const cookies = cookiesFalsas();
  guardarBorrador({ cookies, ...OPCIONES }, formulario({ titulo: "Alta nueva" })); // sin id
  assert.deepEqual(leerBorrador(cookies, OPCIONES.nombre, OPCIONES.ruta, "libro-9"), {});
});

test("el borrador de una fila SI repuebla su propia ficha", () => {
  const cookies = cookiesFalsas();
  guardarBorrador({ cookies, ...OPCIONES, id: "libro-1" }, formulario({ titulo: "Del libro 1" }));
  assert.equal(
    leerBorrador(cookies, OPCIONES.nombre, OPCIONES.ruta, "libro-1").titulo,
    "Del libro 1",
  );
});

test("sin cookie devuelve vacio, no revienta", () => {
  assert.deepEqual(leerBorrador(cookiesFalsas(), OPCIONES.nombre, OPCIONES.ruta), {});
});

test("una cookie corrupta devuelve vacio, no revienta", () => {
  const cookies = cookiesFalsas({ [OPCIONES.nombre]: { valor: "{esto no es json", opciones: {} } });
  assert.deepEqual(leerBorrador(cookies, OPCIONES.nombre, OPCIONES.ruta), {});
});

test("un borrador desmesurado no se guarda: el navegador lo tiraria entero", () => {
  const cookies = cookiesFalsas();
  guardarBorrador({ cookies, ...OPCIONES }, formulario({ sinopsis: "a".repeat(10_000) }));
  assert.equal(cookies.get(OPCIONES.nombre), undefined);
});

test("la cookie se acota a su ruta y no es accesible desde el navegador", () => {
  const cookies = cookiesFalsas();
  guardarBorrador({ cookies, ...OPCIONES }, formulario({ titulo: "X" }));
  const { opciones } = cookies.almacen.get(OPCIONES.nombre);
  assert.equal(opciones.path, OPCIONES.ruta);
  assert.equal(opciones.httpOnly, true);
  assert.equal(opciones.sameSite, "lax");
  assert.ok(opciones.maxAge > 0 && opciones.maxAge <= 300, "solo debe sobrevivir a la redireccion");
});
