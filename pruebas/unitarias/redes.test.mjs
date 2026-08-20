// Pruebas unitarias de src/lib/redes.ts
//
//   pnpm test:unitarias
//
// La direccion de un perfil la pega quien administra y termina en un href del
// pie Y en el `sameAs` del JSON-LD, o sea que se publica como «este es nuestro
// perfil oficial». Aceptar un dominio parecido convertiria el pie del sitio en
// un enlace a otra parte, con la marca del cliente encima.

import { test } from "node:test";
import assert from "node:assert/strict";

import { REDES, esDireccionDeRed, listarRedes, resolverRedes } from "../../src/lib/redes.ts";

const porCampo = (campo) => REDES.find((red) => red.campo === campo);
const facebook = porCampo("facebook");
const youtube = porCampo("youtube");

test("acepta la direccion legitima, con y sin www", () => {
  assert.equal(esDireccionDeRed(facebook, "https://facebook.com/humantouchbooks"), true);
  assert.equal(esDireccionDeRed(facebook, "https://www.facebook.com/humantouchbooks"), true);
});

test("acepta el dominio corto de YouTube si el catalogo lo declara", () => {
  // El catalogo decide que dominios valen; la prueba solo comprueba que la
  // funcion respeta ESA lista y no una idea propia.
  for (const dominio of youtube.dominios) {
    assert.equal(esDireccionDeRed(youtube, `https://${dominio}/htb`), true, dominio);
  }
});

test("rechaza un dominio que solo SE PARECE al legitimo", () => {
  const trampas = [
    "https://facebook.com.evil.test/htb", // el dominio real como subdominio
    "https://evil.test/facebook.com", // el dominio real en la ruta
    "https://notfacebook.com/htb",
    "https://facebook.evil.test/htb",
  ];
  for (const trampa of trampas) {
    assert.equal(esDireccionDeRed(facebook, trampa), false, trampa);
  }
});

test("rechaza el truco de las credenciales en la direccion", () => {
  // El navegador resuelve el anfitrion como «evil.test»: lo de antes de la
  // arroba es usuario y contrasena, no dominio.
  assert.equal(esDireccionDeRed(facebook, "https://facebook.com@evil.test/htb"), false);
});

test("exige https: ni http ni javascript ni data", () => {
  assert.equal(esDireccionDeRed(facebook, "http://facebook.com/htb"), false);
  assert.equal(esDireccionDeRed(facebook, "javascript:alert(1)"), false);
  assert.equal(esDireccionDeRed(facebook, "data:text/html,<script>alert(1)</script>"), false);
});

test("rechaza lo que ni siquiera es una direccion", () => {
  for (const basura of ["", "   ", "facebook.com/htb", "no soy una url"]) {
    assert.equal(esDireccionDeRed(facebook, basura), false, JSON.stringify(basura));
  }
});

test("no confunde una red con otra", () => {
  assert.equal(esDireccionDeRed(facebook, "https://instagram.com/htb"), false);
});

test("resolver: solo devuelve las claves de red presentes en los ajustes", () => {
  const resueltas = resolverRedes({
    [facebook.clave]: "https://facebook.com/htb",
    correo_contacto: "informes@humantouchbooks.pe",
  });
  assert.equal(resueltas[facebook.campo] ?? resueltas[facebook.clave], "https://facebook.com/htb");
  // Un ajuste ajeno no se cuela como si fuera una red.
  assert.ok(!JSON.stringify(resueltas).includes("informes@"));
});

test("listar: sin direcciones cargadas no se pinta ningun icono", () => {
  assert.deepEqual(listarRedes({}), []);
});

test("listar: devuelve solo las cargadas y en el orden del catalogo", () => {
  const todas = {};
  for (const red of REDES) todas[red.campo] = `https://${red.dominios[0]}/htb`;
  const lista = listarRedes(todas);
  assert.equal(lista.length, REDES.length);
  assert.deepEqual(
    lista.map((x) => x.red.campo),
    REDES.map((r) => r.campo),
  );
});
