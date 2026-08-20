// Pruebas unitarias de src/lib/cuerpo.ts
//
//   pnpm test:unitarias
//
// Es la unica defensa contra un cuerpo enorme enviado a /api/admin/sesion, que
// esta EXENTO de sesion: sin ella, cualquiera sin credenciales podia hacer que
// el proceso se quedara sin memoria. La guarda anterior miraba Content-Length y
// se evadia de dos formas —cabecera ausente (Transfer-Encoding: chunked) o no
// numerica, que produce NaN y NaN nunca es mayor que el tope—, asi que estas
// pruebas comprueban justamente esas dos.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ErrorCuerpoExcedido,
  TAMANO_FORMULARIO,
  TAMANO_FORMULARIO_CON_ARCHIVO,
  leerFormulario,
  respuestaCuerpoExcedido,
} from "../../src/lib/cuerpo.ts";

/** Peticion con cuerpo de formulario y Content-Length honesto. */
function peticion(campos) {
  const cuerpo = new URLSearchParams(campos).toString();
  return new Request("https://ejemplo.test/api", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: cuerpo,
  });
}

/** Peticion cuyo cuerpo llega por partes: NO lleva Content-Length. */
function peticionPorPartes(trozos) {
  const flujo = new ReadableStream({
    start(control) {
      for (const t of trozos) control.enqueue(new TextEncoder().encode(t));
      control.close();
    },
  });
  return new Request("https://ejemplo.test/api", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: flujo,
    duplex: "half",
  });
}

test("un formulario normal pasa y se lee entero", async () => {
  const datos = await leerFormulario(peticion({ correo: "a@b.pe", clave: "secreta" }), 1024);
  assert.equal(datos.get("correo"), "a@b.pe");
  assert.equal(datos.get("clave"), "secreta");
});

test("un cuerpo por encima del tope se rechaza", async () => {
  const grande = peticion({ texto: "a".repeat(5000) });
  await assert.rejects(() => leerFormulario(grande, 1024), ErrorCuerpoExcedido);
});

test("justo en el limite todavia pasa", async () => {
  const cuerpo = new URLSearchParams({ t: "a".repeat(100) }).toString();
  const datos = await leerFormulario(peticion({ t: "a".repeat(100) }), cuerpo.length);
  assert.equal(datos.get("t").length, 100);
});

test("EVASION 1: sin Content-Length (cuerpo por partes) el tope se aplica igual", async () => {
  // Aqui esta el fallo de la guarda vieja: no habia cabecera que mirar y el
  // cuerpo entraba entero. El tope real se cuenta sobre los bytes que llegan.
  const enorme = peticionPorPartes(Array.from({ length: 40 }, () => "x".repeat(1000)));
  assert.equal(enorme.headers.get("content-length"), null, "la peticion no debia traer longitud");
  await assert.rejects(() => leerFormulario(enorme, 1024), ErrorCuerpoExcedido);
});

test("EVASION 2: un Content-Length mentiroso no habilita un cuerpo grande", async () => {
  // Declarar poco y mandar mucho: la cabecera no manda, mandan los bytes.
  const flujo = new ReadableStream({
    start(control) {
      control.enqueue(new TextEncoder().encode("y".repeat(50_000)));
      control.close();
    },
  });
  const mentirosa = new Request("https://ejemplo.test/api", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", "content-length": "10" },
    body: flujo,
    duplex: "half",
  });
  await assert.rejects(() => leerFormulario(mentirosa, 1024), ErrorCuerpoExcedido);
});

test("un Content-Length descomunal se corta ANTES de leer nada", async () => {
  const anunciada = new Request("https://ejemplo.test/api", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", "content-length": "999999999" },
    body: "t=1",
  });
  await assert.rejects(() => leerFormulario(anunciada, 1024), ErrorCuerpoExcedido);
});

test("una peticion sin cuerpo no revienta", async () => {
  const vacia = new Request("https://ejemplo.test/api", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "",
  });
  const datos = await leerFormulario(vacia, 1024);
  assert.equal([...datos.keys()].length, 0);
});

test("los topes tienen valores razonables y ordenados", () => {
  assert.ok(TAMANO_FORMULARIO >= 64 * 1024, "un formulario de texto necesita margen");
  assert.ok(
    TAMANO_FORMULARIO_CON_ARCHIVO > TAMANO_FORMULARIO,
    "el de imagenes tiene que ser el mayor",
  );
  // La imagen se valida aparte a 5 MB: el tope del cuerpo va por encima para
  // que el mensaje que reciba quien sube sea el del archivo, no el del cuerpo.
  assert.ok(TAMANO_FORMULARIO_CON_ARCHIVO > 5 * 1024 * 1024);
});

test("la respuesta de cuerpo excedido es un 413 legible", async () => {
  const r = respuestaCuerpoExcedido();
  assert.equal(r.status, 413);
  assert.match(r.headers.get("content-type") ?? "", /text\/plain/);
  assert.ok((await r.text()).length > 0);
});
