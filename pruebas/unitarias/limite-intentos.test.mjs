// Pruebas unitarias de `ipDelCliente` (src/lib/limite-intentos.ts)
//
//   pnpm test:unitarias
//   node --experimental-strip-types --test "pruebas/unitarias/*.test.mjs"
//
// Es la identidad sobre la que se apoya el limite de intentos del login y del
// formulario publico. Si devuelve un valor que el cliente controla, el limite
// deja de existir: basta con mandar una cabecera distinta en cada peticion para
// estrenar cupo. Por eso cada caso de aqui es, en el fondo, un intento de bypass.

import { test } from "node:test";
import assert from "node:assert/strict";

import { ipDelCliente } from "../../src/lib/limite-intentos.ts";

/** IP que reporta el socket. Nunca deberia ganarle a la cadena del proxy. */
const DIRECCION_SOCKET = "10.0.0.1";

function peticion(cabeceras) {
  return new Request("https://humantouchbooks.test/api/contacto", { headers: cabeceras });
}

const ipCon = (cabeceras) => ipDelCliente(peticion(cabeceras), DIRECCION_SOCKET);

// La cadena crece por la derecha: lo que esta a la izquierda lo escribio quien
// llama. Este es el ataque real, no un caso de laboratorio.
test("la IP publica que inyecta el cliente a la izquierda no gana", () => {
  assert.equal(
    ipCon({ "x-forwarded-for": "203.0.113.9, 190.237.10.20" }),
    "190.237.10.20",
    "gano el valor falsificable de la izquierda",
  );
});

test("varias IPs inyectadas a la izquierda tampoco ganan", () => {
  assert.equal(
    ipCon({ "x-forwarded-for": "8.8.8.8, 1.1.1.1, 203.0.113.9, 190.237.10.20" }),
    "190.237.10.20",
  );
});

test("una sola IP publica en la cadena es la del cliente", () => {
  assert.equal(ipCon({ "x-forwarded-for": "190.237.10.20" }), "190.237.10.20");
});

test("los saltos internos de la derecha se saltan hasta la primera publica", () => {
  assert.equal(
    ipCon({ "x-forwarded-for": "203.0.113.9, 190.237.10.20, 10.0.0.7, 172.16.4.2" }),
    "190.237.10.20",
  );
});

// Railway mete el trafico por 100.64.0.0/10: si ese salto contara como cliente,
// TODO el sitio compartiria una sola cuenta de intentos.
test("el CGNAT 100.64.0.0/10 de Railway no identifica a nadie", () => {
  assert.equal(ipCon({ "x-forwarded-for": "190.237.10.20, 100.64.0.9" }), "190.237.10.20");
  assert.equal(ipCon({ "x-forwarded-for": "190.237.10.20, 100.127.255.254" }), "190.237.10.20");
});

// Los bordes del /10 son publicos de verdad: recortar de mas dejaria fuera a
// clientes legitimos y los meteria a todos en la misma cuenta.
test("100.63.x y 100.128.x quedan fuera del CGNAT y si identifican", () => {
  assert.equal(ipCon({ "x-forwarded-for": "100.63.255.255" }), "100.63.255.255");
  assert.equal(ipCon({ "x-forwarded-for": "100.128.0.1" }), "100.128.0.1");
});

test("los demas rangos internos tampoco identifican", () => {
  for (const interna of ["10.1.2.3", "127.0.0.1", "192.168.1.5", "169.254.1.1", "0.0.0.0"]) {
    assert.equal(
      ipCon({ "x-forwarded-for": `190.237.10.20, ${interna}` }),
      "190.237.10.20",
      `${interna} se colo como IP de cliente`,
    );
  }
});

test("172.16-31 es privada pero 172.32 no", () => {
  assert.equal(ipCon({ "x-forwarded-for": "190.237.10.20, 172.31.255.1" }), "190.237.10.20");
  assert.equal(ipCon({ "x-forwarded-for": "190.237.10.20, 172.32.0.1" }), "172.32.0.1");
});

test("con todos los saltos internos se usa el ultimo, no el primero", () => {
  assert.equal(ipCon({ "x-forwarded-for": "10.0.0.1, 192.168.1.5, 100.64.3.7" }), "100.64.3.7");
});

test("un unico salto interno se devuelve tal cual", () => {
  assert.equal(ipCon({ "x-forwarded-for": "127.0.0.1" }), "127.0.0.1");
});

test("IPv6 con corchetes y puerto se normaliza sin el puerto", () => {
  assert.equal(ipCon({ "x-forwarded-for": "[2001:db8::1]:443" }), "2001:db8::1");
  assert.equal(ipCon({ "x-forwarded-for": "[2001:db8::1]" }), "2001:db8::1");
});

test("IPv6 sin corchetes no se parte por los dos puntos", () => {
  assert.equal(ipCon({ "x-forwarded-for": "2001:db8:0:0:0:0:0:1" }), "2001:db8:0:0:0:0:0:1");
});

test("IPv6 de bucle y de enlace local no identifican", () => {
  assert.equal(ipCon({ "x-forwarded-for": "2001:db8::1, [::1]:443" }), "2001:db8::1");
  assert.equal(ipCon({ "x-forwarded-for": "2001:db8::1, fe80::1" }), "2001:db8::1");
  assert.equal(ipCon({ "x-forwarded-for": "2001:db8::1, fd00::1" }), "2001:db8::1");
});

test("IPv4 con puerto pierde el puerto", () => {
  assert.equal(ipCon({ "x-forwarded-for": "190.237.10.20:51820" }), "190.237.10.20");
});

test("los espacios y las entradas vacias de la cadena se descartan", () => {
  assert.equal(
    ipCon({ "x-forwarded-for": " 203.0.113.9 ,  , 190.237.10.20 ,  " }),
    "190.237.10.20",
  );
});

test("una cadena que solo trae separadores cae en la direccion del socket", () => {
  assert.equal(ipCon({ "x-forwarded-for": " , , " }), DIRECCION_SOCKET);
});

// X-Real-IP es un valor suelto y por si solo falsificable: solo se mira cuando
// no hay cadena, y nunca por delante de ella.
test("X-Real-IP solo se usa cuando no hay X-Forwarded-For", () => {
  assert.equal(ipCon({ "x-real-ip": "190.237.10.20" }), "190.237.10.20");
  assert.equal(
    ipCon({ "x-forwarded-for": "190.237.10.20", "x-real-ip": "203.0.113.9" }),
    "190.237.10.20",
    "X-Real-IP le gano a la cadena del proxy",
  );
});

test("X-Real-IP tambien se normaliza", () => {
  assert.equal(ipCon({ "x-real-ip": "  [2001:db8::1]:443  " }), "2001:db8::1");
});

test("X-Real-IP vacio cae en la direccion del socket", () => {
  assert.equal(ipCon({ "x-real-ip": "   " }), DIRECCION_SOCKET);
});

test("sin ninguna cabecera se usa la direccion del socket", () => {
  assert.equal(ipCon({}), DIRECCION_SOCKET);
});
