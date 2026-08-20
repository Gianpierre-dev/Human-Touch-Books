// Pruebas unitarias de las funciones que deciden QUE TEXTO ve la visitante:
// src/lib/correo.ts, src/lib/paginas.ts y src/lib/bloques.ts.
//
//   pnpm test:unitarias

import { test } from "node:test";
import assert from "node:assert/strict";

import { LARGO_MAXIMO_CORREO, esCorreoValido } from "../../src/lib/correo.ts";
import { partirEnParrafos, recortarDescripcion } from "../../src/lib/paginas.ts";
import { resolverColeccion } from "../../src/lib/bloques.ts";

// --- Correo -----------------------------------------------------------------
// Un valor a medias guardado como correo de contacto deja el `mailto:` de TODA
// la web y el JSON-LD apuntando a ninguna parte.

test("correo: acepta las direcciones normales", () => {
  for (const bueno of [
    "informes@humantouchbooks.pe",
    "ana.perez@colegio.edu.pe",
    "contacto+ventas@htb.com.pe",
  ]) {
    assert.equal(esCorreoValido(bueno), true, bueno);
  }
});

test("correo: rechaza el caso que motivo la validacion", () => {
  // «informes@» es lo que se podia guardar antes y rompia el sitio entero.
  assert.equal(esCorreoValido("informes@"), false);
});

test("correo: rechaza lo que claramente no es una direccion", () => {
  for (const malo of ["", "hola", "@htb.pe", "a b@htb.pe", "a@htb", "a@htb.p", "a@@htb.pe"]) {
    assert.equal(esCorreoValido(malo), false, JSON.stringify(malo));
  }
});

test("correo: rechaza uno mas largo que el tope del campo", () => {
  const larguisimo = "a".repeat(LARGO_MAXIMO_CORREO) + "@htb.pe";
  assert.equal(esCorreoValido(larguisimo), false);
});

// --- Recorte de la meta descripcion ------------------------------------------

test("descripcion: un texto corto se deja intacto y sin puntos suspensivos", () => {
  const corto = "Editorial peruana de textos escolares.";
  assert.equal(recortarDescripcion(corto), corto);
});

test("descripcion: nunca pasa del tope pedido", () => {
  const largo = "palabra ".repeat(60);
  const salida = recortarDescripcion(largo, 100);
  assert.ok(salida.length <= 101, `midio ${salida.length}`); // +1 por el caracter de puntos
});

test("descripcion: corta en el ultimo espacio, no a media palabra", () => {
  const texto = "Somos una editorial especializada en materiales educativos para colegios";
  const salida = recortarDescripcion(texto, 30);
  // Lo que queda antes de los puntos suspensivos tiene que ser una palabra entera.
  const sinPuntos = salida.replace(/…$/, "");
  assert.ok(texto.startsWith(sinPuntos), "el recorte no es un prefijo del original");
  assert.ok(
    texto[sinPuntos.length] === " " || texto[sinPuntos.length] === undefined,
    `corto a media palabra: «${sinPuntos}»`,
  );
});

test("descripcion: normaliza los espacios y saltos de linea", () => {
  assert.equal(recortarDescripcion("  Hola\n\n  mundo \t raro  "), "Hola mundo raro");
});

test("descripcion: un texto vacio devuelve vacio (la pagina cae a su respaldo)", () => {
  assert.equal(recortarDescripcion(""), "");
  assert.equal(recortarDescripcion("   \n  "), "");
});

test("descripcion: una sola palabra larguisima se corta igual antes que quedar en nada", () => {
  const salida = recortarDescripcion("a".repeat(300), 50);
  assert.ok(salida.length <= 51);
  assert.ok(salida.length > 40, "recortar hasta la nada seria peor");
});

// --- Parrafos ---------------------------------------------------------------

test("parrafos: separa por linea en blanco y limpia los sobrantes", () => {
  const texto = "Primero.\n\n  Segundo.  \n\n\n\nTercero.\n\n   ";
  assert.deepEqual(partirEnParrafos(texto), ["Primero.", "Segundo.", "Tercero."]);
});

test("parrafos: un salto simple NO separa parrafos", () => {
  assert.deepEqual(partirEnParrafos("Una linea\ny su continuacion"), [
    "Una linea\ny su continuacion",
  ]);
});

test("parrafos: sin texto devuelve lista vacia", () => {
  assert.deepEqual(partirEnParrafos(null), []);
  assert.deepEqual(partirEnParrafos(""), []);
  assert.deepEqual(partirEnParrafos("   \n\n  "), []);
});

// --- Coleccion: cargado vs oculto -------------------------------------------
// La distincion que esta funcion protege: «todavia no hay nada» NO es lo mismo
// que «los cargue y los oculte». Caer al diseno en el segundo caso resucitaria
// textos que quien administra creia reemplazados.

const DISENO = [{ titulo: "Del diseño", texto: "..." }];
const CARGADOS = [{ titulo: "Del panel", texto: "..." }];

test("coleccion: sin nada cargado se usa el diseno", () => {
  assert.deepEqual(resolverColeccion([], DISENO, 0), DISENO);
});

test("coleccion: con elementos visibles se usan los del panel", () => {
  assert.deepEqual(resolverColeccion(CARGADOS, DISENO, 1), CARGADOS);
});

test("coleccion: cargados PERO TODOS OCULTOS no resucita el diseno", () => {
  // Visibles: ninguno. Cargados en total: 3. La zona queda vacia a proposito.
  assert.deepEqual(resolverColeccion([], DISENO, 3), []);
});
