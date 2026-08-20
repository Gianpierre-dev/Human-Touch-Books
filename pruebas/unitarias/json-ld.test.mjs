// Pruebas unitarias de src/lib/json-ld.ts
//
//   pnpm test:unitarias
//
// Este modulo es una FRONTERA DE SEGURIDAD: mete texto que escribe quien
// administra dentro de un <script>. Si el escapado falla, un titulo con
// «</script>» cierra el bloque antes de tiempo y lo que siga se interpreta como
// marcado. De ahi que las pruebas insistan tanto en ese caso.

import { test } from "node:test";
import assert from "node:assert/strict";

import { migasDePan, serializarJsonLd } from "../../src/lib/json-ld.ts";

test("serializar: el resultado siempre es JSON valido y conserva el dato", () => {
  const datos = { "@type": "Organization", name: "Human Touch Books", cantidad: 12 };
  const salida = serializarJsonLd(datos);
  assert.deepEqual(JSON.parse(salida), datos);
});

test("serializar: «</script>» no puede cerrar el bloque", () => {
  const salida = serializarJsonLd({ name: "Fin </script><img src=x onerror=alert(1)>" });

  // Ni una sola secuencia capaz de cerrar el elemento.
  assert.ok(!salida.includes("</script"), "el escapado dejo pasar un cierre de script");
  assert.ok(!salida.includes("<"), "quedo un '<' sin escapar");

  // Y el dato llega intacto a quien lo lea: el escape es \\u003c, que el
  // analizador de JSON devuelve como "<".
  assert.equal(JSON.parse(salida).name, "Fin </script><img src=x onerror=alert(1)>");
});

test("serializar: las comillas y los saltos de linea no rompen el bloque", () => {
  const texto = 'Ella dijo "hola"\ny se fue.\t\\ruta';
  const salida = serializarJsonLd({ texto });
  assert.equal(JSON.parse(salida).texto, texto);
});

test("serializar: un texto con caracteres unicode sobrevive", () => {
  const texto = "Misión y visión — Tutoría SMART · 1.° grado";
  assert.equal(JSON.parse(serializarJsonLd({ texto })).texto, texto);
});

const BASE = new URL("https://humantouchbooks.pe");

test("migas: numera desde 1 y resuelve rutas absolutas contra el dominio", () => {
  const salida = JSON.parse(
    migasDePan(
      [
        { nombre: "Inicio", ruta: "/" },
        { nombre: "Nosotros", ruta: "/" },
        { nombre: "¿Quiénes somos?", ruta: "/nosotros/quienes-somos" },
      ],
      BASE,
    ),
  );

  assert.equal(salida["@type"], "BreadcrumbList");
  assert.deepEqual(
    salida.itemListElement.map((i) => i.position),
    [1, 2, 3],
  );
  assert.equal(salida.itemListElement[2].name, "¿Quiénes somos?");
  assert.equal(salida.itemListElement[2].item, "https://humantouchbooks.pe/nosotros/quienes-somos");
});

test("migas: el dominio manda sobre la ruta, no al reves", () => {
  const salida = JSON.parse(migasDePan([{ nombre: "Inicio", ruta: "/" }], BASE));
  // Aunque el sitio se sirva desde otro host, la miga apunta al dominio real.
  assert.ok(salida.itemListElement[0].item.startsWith("https://humantouchbooks.pe/"));
});

test("migas: un nombre con «</script>» tampoco puede cerrar el bloque", () => {
  const salida = migasDePan([{ nombre: "</script>uy", ruta: "/" }], BASE);
  assert.ok(!salida.includes("</script"));
  assert.equal(JSON.parse(salida).itemListElement[0].name, "</script>uy");
});

test("migas: una lista vacia produce un bloque valido y vacio", () => {
  const salida = JSON.parse(migasDePan([], BASE));
  assert.deepEqual(salida.itemListElement, []);
});
