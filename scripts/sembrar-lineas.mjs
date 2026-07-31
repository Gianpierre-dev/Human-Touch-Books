// Siembra las tres lineas de producto y asigna cada libro del catalogo a la
// suya. Se ejecuta UNA vez, a mano, tras aplicar la migracion:
//
//   node scripts/sembrar-lineas.mjs
//
// No vive en prisma/seed.mjs a proposito: ese script corre en cada despliegue y
// esto es una carga puntual de datos.
//
// Volver a correrlo es inofensivo: si el reparto inicial ya se hizo, sale sin
// tocar nada. Y el upsert no pisa lo editado desde el panel (`update: {}`), como
// hace prisma/seed.mjs con los demas datos.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const LINEAS = [
  {
    clave: "primaria",
    nombre: "Tutoría SMART Primaria",
    etiquetaCorta: "Primaria",
    descripcion:
      "Desarrolla habilidades socioemocionales, convivencia escolar y formación integral desde 1.° hasta 6.° grado.",
    colorHex: "#1e6fd9",
    orden: 1,
  },
  {
    clave: "secundaria",
    nombre: "Tutoría SMART Secundaria",
    etiquetaCorta: "Secundaria",
    descripcion:
      "Propuesta orientada a fortalecer la formación integral de los estudiantes, contribuyendo a su desarrollo personal, social y académico.",
    colorHex: "#6d28d9",
    orden: 2,
  },
  {
    clave: "lector",
    nombre: "Colección HTB Lector",
    etiquetaCorta: "HTB Lector",
    descripcion:
      "Lecturas que acompañan el desarrollo de la empatía, los valores y el hábito lector.",
    colorHex: "#1e6fd9",
    orden: 3,
  },
];

/**
 * Reparto inicial de los libros que ya existian: el enum `linea` sigue siendo la
 * fuente de verdad de la landing, asi que se usa como criterio.
 * - `escolar`  → Primaria (los seis titulos actuales son de 1.° a 6.° de primaria)
 * - `literatura` → HTB Lector
 * Secundaria queda sin libros hasta que se carguen desde el panel.
 */
const LINEA_SEGUN_ENUM = { escolar: "primaria", literatura: "lector" };

async function principal() {
  for (const linea of LINEAS) {
    // `update: {}`: si la linea ya existe se deja como esta. Nombre, color y
    // descripcion son editables desde el panel y una segunda corrida no puede
    // revertir esas ediciones.
    await prisma.linea.upsert({ where: { clave: linea.clave }, update: {}, create: linea });
  }
  console.log(`Lineas sembradas: ${LINEAS.length}`);

  const porClave = new Map(
    (await prisma.linea.findMany({ select: { id: true, clave: true } })).map((l) => [l.clave, l.id]),
  );

  // El reparto inicial se hace UNA sola vez. Si ya hay libros con linea, este
  // script no vuelve a repartir: un libro nuevo de Secundaria cargado desde el
  // panel tiene `linea: "escolar"` y caeria en Primaria por el mapa de arriba,
  // que solo describe el catalogo que existia antes de la migracion.
  const yaRepartido = await prisma.libro.count({ where: { lineaId: { not: null } } });
  if (yaRepartido > 0) {
    console.log(`Reparto inicial ya hecho (${yaRepartido} libro(s) con linea). No se toca nada.`);
    await resumen(porClave);
    return;
  }

  const pendientes = await prisma.libro.findMany({
    where: { lineaId: null },
    select: { id: true, titulo: true, linea: true },
  });

  let asignados = 0;
  for (const libro of pendientes) {
    const claveDestino = LINEA_SEGUN_ENUM[libro.linea];
    const lineaId = claveDestino ? porClave.get(claveDestino) : undefined;
    if (!lineaId) {
      console.warn(`Sin linea destino para «${libro.titulo}» (${libro.linea}). Se deja sin asignar.`);
      continue;
    }
    // Se toca UNICAMENTE lineaId: ningun otro campo del libro se modifica.
    await prisma.libro.update({ where: { id: libro.id }, data: { lineaId } });
    asignados += 1;
  }

  console.log(`Libros asignados en esta corrida: ${asignados} (pendientes previos: ${pendientes.length})`);
  await resumen(porClave);
}

async function resumen(porClave) {
  for (const [clave, id] of porClave) {
    const total = await prisma.libro.count({ where: { lineaId: id } });
    console.log(`  ${clave}: ${total} libro(s)`);
  }
}

try {
  await principal();
} finally {
  await prisma.$disconnect();
}
