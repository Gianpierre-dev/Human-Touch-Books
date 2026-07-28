// Siembra inicial: usuario admin, catalogo actual y ajustes de contacto.
// Idempotente: puede ejecutarse varias veces sin duplicar datos.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const LIBROS = [1, 2, 3, 4, 5, 6].map((n) => ({
  titulo: `Tutoría SMART ${n}`,
  subtitulo: "Tutoría, Orientación Educativa y Convivencia Escolar",
  linea: "escolar",
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
  linea: "literatura",
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
  const correo = process.env.ADMIN_CORREO;
  const clave = process.env.ADMIN_CLAVE;
  if (correo && clave) {
    await prisma.usuario.upsert({
      where: { correo },
      update: {},
      create: {
        correo,
        nombre: "Administrador HTB",
        hashContrasena: await bcrypt.hash(clave, 12),
      },
    });
    console.log(`usuario admin listo: ${correo}`);
  }

  const existentes = await prisma.libro.count();
  if (existentes === 0) {
    await prisma.libro.createMany({ data: LIBROS });
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
