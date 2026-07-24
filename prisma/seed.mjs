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

const AJUSTES = [
  ["correo_contacto", "informes@humantouchbooks.pe"],
  ["whatsapp", "51982953436"],
  ["horario", "Lunes a viernes: 8:00 a. m. – 5:00 p. m. | Sábados: 8:00 a. m. – 1:00 p. m."],
  ["ubicacion", "La Molina, Lima — Perú"],
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
