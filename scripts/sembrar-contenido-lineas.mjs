// Carga el contenido de las paginas publicas de Primaria y Secundaria a partir
// de las piezas de diseno del cliente (primaria.png y secundaria.png).
//
//   node scripts/sembrar-contenido-lineas.mjs
//
// NO vive en prisma/seed.mjs a proposito: ese script corre en cada despliegue y
// esto es una carga puntual de contenido comercial. Si volviera a correr tras
// una edicion desde el panel, la pisaria.
//
// ES IDEMPOTENTE POR ABORTO: si ya existe cualquier fila en BloqueLinea, sale
// sin tocar nada. Es la senal de que la carga ya se hizo (o de que alguien ya
// administro bloques desde el panel), y en los dos casos lo correcto es no
// escribir.
//
// HTB LECTOR SE DEJA VACIA A PROPOSITO: no hay pieza de diseno para esa linea y
// no se inventa contenido. Su pagina se ve entera igual, con los textos por
// defecto derivados de la linea (ver src/lib/lineas.ts).
//
// LAS IMAGENES DE HERO SON PROVISIONALES: /lineas/primaria-hero.jpg y
// /lineas/secundaria-hero.jpg son recortes de la propia pieza de diseno, no
// fotografias originales. Se reemplazan desde /admin/lineas -> «Contenido de la
// pagina publica» -> «Imagen del hero» apenas el cliente envie las suyas.
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const prisma = new PrismaClient();
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Sobre el texto de los argumentos de Secundaria: en la pieza son frases
 * sueltas con una parte en negrita, sin titulo aparte. El modelo pide titulo +
 * texto, asi que se conservo la frase literal como texto y se uso como titulo la
 * idea que la pieza ya destacaba en negrita. No se agrego contenido nuevo.
 */
const CONTENIDO = [
  {
    clave: "primaria",
    linea: {
      heroAntetitulo: "Proyecto",
      heroTitulo: "Tutoría SMART",
      heroParrafo:
        "Desarrolla habilidades socioemocionales, convivencia escolar y formación integral desde 1.° hasta 6.° grado.",
      pilaresTitulo: "¿Qué es Tutoría SMART?",
      pilaresParrafo:
        "Una propuesta innovadora para fortalecer el desarrollo personal, social y académico de los estudiantes, basada en los aportes del Dr. Rafael Bisquerra, referente internacional en educación emocional.",
      coleccionTitulo: "Colección Tutoría SMART",
      argumentosTitulo: "¿Por qué elegir Tutoría SMART?",
      ctaTitulo: "¿Deseas implementar Tutoría SMART en tu institución?",
      ctaParrafo: "Estamos listos para acompañarte en este gran paso hacia una educación integral.",
      heroImagenUrl: "/lineas/primaria-hero.jpg",
      heroImagenAlt: "Estudiantes de primaria trabajando juntos alrededor de una mesa en el aula",
    },
    pilares: [
      "Inteligencia emocional",
      "Convivencia escolar",
      "Desarrollo personal",
      "Aprendizaje significativo",
    ],
    argumentos: [
      { titulo: "6 niveles progresivos", texto: "De 1.° a 6.° grado, con secuencia pedagógica." },
      { titulo: "Material para docentes", texto: "Guías y recursos prácticos para cada unidad." },
      {
        titulo: "Educación emocional",
        texto: "Basado en el modelo de Rafael Bisquerra, referente internacional.",
      },
      {
        titulo: "Adaptado al currículo nacional",
        texto: "Alineado a los enfoques transversales y competencias del CNEB.",
      },
    ],
  },
  {
    clave: "secundaria",
    linea: {
      heroAntetitulo: "Proyecto",
      heroTitulo: "Tutoría SMART",
      // La linea en blanco separa los dos parrafos de la pieza: la pagina los
      // vuelve a partir al renderizar (ver partirEnParrafos en src/lib/lineas.ts).
      heroParrafo:
        'El proyecto "Tutoría SMART" es una propuesta innovadora orientada a fortalecer la formación integral de los estudiantes, contribuyendo a su desarrollo personal, social y académico.\n\nAdemás el proyecto está diseñado a partir de los valiosos aportes académicos del Dr. Rafael Bisquerra, reconocido referente internacional en el campo de la educación emocional.',
      pilaresTitulo: "Una propuesta que transforma",
      pilaresParrafo: null,
      coleccionTitulo: "Colección Tutoría SMART Secundaria",
      argumentosTitulo: "¿Por qué elegir Tutoría SMART?",
      ctaTitulo: "Impulsa el desarrollo integral de tus estudiantes",
      ctaParrafo:
        "Solicita más información y conoce cómo Tutoría SMART puede transformar tu institución.",
      heroImagenUrl: "/lineas/secundaria-hero.jpg",
      heroImagenAlt:
        "Estudiantes de secundaria conversando en el pasillo del colegio mientras revisan una tableta",
    },
    pilares: [
      "Desarrollo personal",
      "Convivencia escolar",
      "Educación emocional",
      "Formación integral",
    ],
    argumentos: [
      {
        titulo: "Educación emocional",
        texto:
          "Basado en el modelo de educación emocional del Dr. Rafael Bisquerra, referente internacional.",
      },
      {
        titulo: "Material práctico",
        texto: "Actualizado para estudiantes y docentes.",
      },
      { titulo: "Enfoque integral", texto: "Personal, social y académico." },
      {
        titulo: "Alineado al CNEB",
        texto: "Enfoques transversales y competencias del Currículo Nacional.",
      },
    ],
  },
];

/** Frases de la pieza para cada tapa de Primaria, por título del libro. */
const DESCRIPCIONES_PRIMARIA = {
  "Tutoría SMART 1": "Descubro y expreso mis emociones, construyendo vínculos positivos.",
  "Tutoría SMART 2": "Me conozco, me relaciono y participo con empatía.",
  "Tutoría SMART 3": "Fortalezco mi autonomía y tomo decisiones responsables.",
  "Tutoría SMART 4": "Convivimos con respeto y resolvemos conflictos de manera positiva.",
  "Tutoría SMART 5": "Desarrollo habilidades para mi bienestar y el de mi comunidad.",
  "Tutoría SMART 6": "Lidero, colaboro y construyo proyectos con propósito.",
};

/** Medidas reales del archivo del repositorio: reservan su hueco en la página. */
async function medidasDe(rutaPublica) {
  const { width, height } = await sharp(join(RAIZ, "public", rutaPublica)).metadata();
  return { heroAncho: width ?? null, heroAlto: height ?? null };
}

async function principal() {
  const yaHayBloques = await prisma.bloqueLinea.count();
  if (yaHayBloques > 0) {
    console.log(
      `Ya hay ${yaHayBloques} bloque(s) de línea cargados. No se toca nada: ` +
        "esta carga es puntual y volver a correrla pisaría lo editado desde el panel.",
    );
    return;
  }

  for (const entrada of CONTENIDO) {
    const linea = await prisma.linea.findUnique({ where: { clave: entrada.clave } });
    if (!linea) {
      console.warn(`No existe la línea «${entrada.clave}». Se omite.`);
      continue;
    }

    const medidas = await medidasDe(entrada.linea.heroImagenUrl);
    await prisma.linea.update({
      where: { id: linea.id },
      data: { ...entrada.linea, ...medidas },
    });

    // `createMany` en una sola llamada por tipo: el orden es la posición en el
    // arreglo, que es la que manda también el icono y el color en la web.
    await prisma.bloqueLinea.createMany({
      data: [
        ...entrada.pilares.map((titulo, indice) => ({
          lineaId: linea.id,
          tipo: "pilar",
          titulo,
          texto: null,
          orden: indice + 1,
        })),
        ...entrada.argumentos.map((argumento, indice) => ({
          lineaId: linea.id,
          tipo: "argumento",
          titulo: argumento.titulo,
          texto: argumento.texto,
          orden: indice + 1,
        })),
      ],
    });

    console.log(
      `${entrada.clave}: contenido + ${entrada.pilares.length} pilares + ` +
        `${entrada.argumentos.length} argumentos.`,
    );
  }

  // Las frases de las tapas: sólo se escriben en los libros que aún no la tienen.
  let tapas = 0;
  for (const [titulo, descripcionCorta] of Object.entries(DESCRIPCIONES_PRIMARIA)) {
    const { count } = await prisma.libro.updateMany({
      where: { titulo, descripcionCorta: null },
      data: { descripcionCorta },
    });
    tapas += count;
  }
  console.log(`Descripciones cortas cargadas: ${tapas}`);

  console.log(
    "\nRECORDATORIO: las imágenes del hero son recortes provisionales del diseño.\n" +
      "Reemplázalas en /admin/lineas cuando el cliente envíe las fotografías originales.",
  );
}

try {
  await principal();
} finally {
  await prisma.$disconnect();
}
