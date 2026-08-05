// Siembra inicial: usuario admin, lineas de producto, catalogo actual y ajustes
// de contacto. Idempotente: puede ejecutarse varias veces sin duplicar datos ni
// pisar lo editado desde el panel.
//
// Las LINEAS van primero porque el catalogo cuelga de ellas: cada libro se
// referencia por la clave de su linea y sin ellas no se puede sembrar nada.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// El `tipo` clasifica a la LINEA, y de ahi lo heredan sus libros: decide si sus
// titulos salen en la Coleccion escolar o en el Plan Lector de la portada.
const LINEAS = [
  {
    clave: "primaria",
    nombre: "Tutoría SMART Primaria",
    etiquetaCorta: "Primaria",
    descripcion:
      "Desarrolla habilidades socioemocionales, convivencia escolar y formación integral desde 1.° hasta 6.° grado.",
    tipo: "escolar",
    colorHex: "#1e6fd9",
    orden: 1,
  },
  {
    clave: "secundaria",
    nombre: "Tutoría SMART Secundaria",
    etiquetaCorta: "Secundaria",
    descripcion:
      "Propuesta orientada a fortalecer la formación integral de los estudiantes, contribuyendo a su desarrollo personal, social y académico.",
    tipo: "escolar",
    colorHex: "#6d28d9",
    orden: 2,
  },
  {
    clave: "lector",
    nombre: "Colección HTB Lector",
    etiquetaCorta: "HTB Lector",
    descripcion:
      "Lecturas que acompañan el desarrollo de la empatía, los valores y el hábito lector.",
    tipo: "literatura",
    colorHex: "#1e6fd9",
    orden: 3,
  },
];

// `claveLinea` no es una columna: se resuelve al id real de la linea antes de
// insertar (ver `main`).
const LIBROS = [1, 2, 3, 4, 5, 6].map((n) => ({
  titulo: `Tutoría SMART ${n}`,
  subtitulo: "Tutoría, Orientación Educativa y Convivencia Escolar",
  claveLinea: "primaria",
  grado: `${n}.° de Primaria`,
  nivel: "Primaria",
  sinopsis: `Programa de tutoría y convivencia escolar para ${n}.° de Primaria. Fortalece las habilidades socioemocionales, el liderazgo y el proyecto de vida de cada estudiante.`,
  portadaUrl: `/covers/smart-${n}.jpg`,
  orden: n,
  destacado: true,
}));

LIBROS.push({
  titulo: "Llévenme a mi casa",
  subtitulo: "Por favor… llévenme a mi casa",
  claveLinea: "lector",
  grado: null,
  nivel: "Plan Lector",
  autor: "Miguel Ángel Aguilar",
  ilustrador: "Fiorella Alegría Córdova",
  anio: 2026,
  sinopsis:
    "A sus 86 años, Chachita lucha contra los hilos sueltos de la memoria. Una historia sobre el amor, la vejez y la fragilidad del recuerdo.",
  portadaUrl: "/covers/llevenme-a-mi-casa.jpg",
  orden: 7,
  destacado: true,
});

// Solo datos de contacto. `hero_subtitulo` y `nosotros_texto` NO se siembran a
// proposito: mientras no exista la fila, la landing calcula su texto por defecto
// (el de Nosotros incluye la ubicacion). Sembrarlos congelaria esos textos.
const AJUSTES = [
  ["correo_contacto", "informes@humantouchbooks.pe"],
  ["whatsapp", "51982953436"],
  ["horario", "Lunes a viernes: 8:00 a. m. – 5:00 p. m. | Sábados: 8:00 a. m. – 1:00 p. m."],
  ["ubicacion", "La Molina, Lima — Perú"],
];

// Las preguntas frecuentes que la web ya mostraba, con las plantillas resueltas
// contra los datos actuales (6 titulos escolares, linea de Plan Lector, y los
// ajustes de contacto de arriba). A partir de aqui se editan desde el panel.
const PREGUNTAS = [
  {
    pregunta: "¿Para qué grados está disponible la colección?",
    respuesta:
      "Tutoría SMART reúne 6 títulos, uno por grado: de 1.° de Primaria a 6.° de Primaria. " +
      "Además contamos con una línea de Plan Lector.",
    orden: 1,
  },
  {
    pregunta: "¿Trabajan con colegios o también con padres de familia?",
    respuesta:
      "Con ambos. En el formulario puedes elegir información para colegios, información para " +
      "padres de familia o capacitaciones y talleres.",
    orden: 2,
  },
  {
    pregunta: "¿Cómo solicito información o una cotización?",
    respuesta:
      "Completa el formulario de contacto, escríbenos a informes@humantouchbooks.pe o " +
      "contáctanos por WhatsApp al +51 982 953 436.",
    enlaceHref: "#contacto",
    enlaceTexto: "Ir al formulario",
    orden: 3,
  },
  {
    pregunta: "¿Dónde están y en qué horario atienden?",
    respuesta:
      "Estamos en La Molina, Lima — Perú. Horario de atención: Lunes a viernes: 8:00 a. m. – " +
      "5:00 p. m. · Sábados: 8:00 a. m. – 1:00 p. m.",
    orden: 4,
  },
  {
    pregunta: "¿Cómo se accede a la plataforma Tutoría SMART?",
    respuesta:
      "La plataforma se habilita para las instituciones que trabajan con la editorial. " +
      "Solicita el acceso desde el formulario y lo coordinamos con tu colegio.",
    enlaceHref: "#contacto",
    enlaceTexto: "Solicitar acceso",
    orden: 5,
  },
];

async function main() {
  // Guarda por conteo, como las lineas: el seed corre en CADA arranque del
  // contenedor, y un upsert por correo resucitaria una cuenta que el panel dio
  // de baja — con la contrasena del .env, que la persona dada de baja conoce.
  // Solo siembra con la tabla vacia (lo que ademas repone el acceso si el
  // panel se quedara sin ninguna cuenta). En minusculas, como exige el login.
  const correo = process.env.ADMIN_CORREO?.trim().toLowerCase();
  const clave = process.env.ADMIN_CLAVE;
  const usuariosExistentes = await prisma.usuario.count();
  if (usuariosExistentes === 0 && correo && clave) {
    await prisma.usuario.create({
      data: {
        correo,
        nombre: "Administrador HTB",
        hashContrasena: await bcrypt.hash(clave, 12),
      },
    });
    console.log(`usuario admin sembrado: ${correo}`);
  }

  // Guarda por conteo, como los libros: el seed corre en CADA arranque del
  // contenedor, y un upsert por clave resucitaria una linea que el panel borro
  // (o crearia un duplicado si le cambiaron la clave). Solo siembra en vacio.
  const lineasExistentes = await prisma.linea.count();
  if (lineasExistentes === 0) {
    await prisma.linea.createMany({ data: LINEAS });
    console.log(`lineas sembradas: ${LINEAS.length}`);
  } else {
    console.log(`lineas ya existentes: ${lineasExistentes} (sin cambios)`);
  }

  const idPorClave = new Map(
    (await prisma.linea.findMany({ select: { id: true, clave: true } })).map((l) => [
      l.clave,
      l.id,
    ]),
  );

  const existentes = await prisma.libro.count();
  if (existentes === 0) {
    await prisma.libro.createMany({
      data: LIBROS.map(({ claveLinea, ...libro }) => ({
        ...libro,
        lineaId: idPorClave.get(claveLinea),
      })),
    });
    console.log(`libros sembrados: ${LIBROS.length}`);
  } else {
    console.log(`libros ya existentes: ${existentes} (sin cambios)`);
  }

  for (const [clave2, valor] of AJUSTES) {
    await prisma.ajuste.upsert({
      where: { clave: clave2 },
      update: {},
      create: { clave: clave2, valor },
    });
  }
  console.log("ajustes listos");

  const preguntasExistentes = await prisma.pregunta.count();
  if (preguntasExistentes === 0) {
    await prisma.pregunta.createMany({ data: PREGUNTAS });
    console.log(`preguntas sembradas: ${PREGUNTAS.length}`);
  } else {
    console.log(`preguntas ya existentes: ${preguntasExistentes} (sin cambios)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
