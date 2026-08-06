// Carga las paginas institucionales a partir de las piezas de diseno del
// cliente (quienessomos.png y «mision vision.png»).
//
//   node scripts/sembrar-paginas.mjs
//
// NO vive en prisma/seed.mjs a proposito: ese script corre en cada despliegue y
// esto es una carga puntual de contenido comercial. Si volviera a correr tras
// una edicion desde el panel, la pisaria.
//
// ES IDEMPOTENTE POR ABORTO: si ya existe cualquier fila en PaginaInstitucional
// sale sin tocar nada. Es la senal de que la carga ya se hizo (o de que alguien
// ya administro paginas desde el panel), y en los dos casos lo correcto es no
// escribir.
//
// COMPROMISO SE SIEMBRA PUBLICADA: su pieza de diseno llego el 2026-08-05 (los
// tres compromisos y la franja de cierre) y el contenido de abajo la transcribe.
//
// LAS IMAGENES SON PROVISIONALES: /lineas/quienes-somos-hero.jpg y
// /lineas/institucional-hero.jpg son recortes de las propias piezas de diseno,
// no fotografias originales. Se reemplazan desde /admin/paginas -> «Contenido
// de la pagina publica» -> «Fotografia» apenas el cliente envie las suyas.
//
// DECISION SOBRE LAS DOS VINETAS DE LA VISION: en la pieza son dos frases con
// un check al costado. Van como parrafos del texto de la seccion «Vision», no
// como valores: forman parte del enunciado de la vision, mientras que
// BloquePagina modela la tira de cuatro valores de abajo. El modelo no tiene
// listas de vinetas y crear una para dos frases seria sobre-modelar; se pierde
// el icono de check, no el contenido.
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const prisma = new PrismaClient();
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");

const PAGINAS = [
  {
    clave: "quienes-somos",
    titulo: "¿Quiénes somos?",
    orden: 1,
    activa: true,
    contenido: {
      antetitulo: "Quiénes somos",
      tituloPagina: "Una editorial con propósito, comprometida con",
      tituloDestacado: "las personas y la educación.",
      parrafos: [
        "Somos una editorial especializada en crear materiales que inspiran, educan y acompañan el desarrollo integral de niños y adolescentes.",
        "Creemos en el poder transformador de la educación y en el rol fundamental de la familia y la comunidad en la formación de mejores personas y una sociedad más justa y solidaria.",
      ].join("\n\n"),
      imagenUrl: "/lineas/quienes-somos-hero.jpg",
      imagenAlt:
        "Pila de libros sobre un escritorio junto a una planta, con una estantería de fondo",
      bloquesAntetitulo: "Nuestros valores",
      bloquesTitulo: "Valores que guían cada una de nuestras acciones",
      cierreTexto: "Trabajamos cada día con la convicción de que",
      cierreDestacado: "la educación transforma vidas.",
    },
    secciones: [],
    valores: [
      {
        titulo: "Ética",
        texto: "Actuamos con honestidad, integridad y responsabilidad en todo lo que hacemos.",
      },
      {
        titulo: "Compromiso",
        texto:
          "Nos dedicamos con pasión a brindar materiales que realmente generan impacto positivo.",
      },
      {
        titulo: "Excelencia",
        texto:
          "Buscamos la mejora continua en cada publicación, cuidando la calidad de nuestros contenidos.",
      },
    ],
  },
  {
    clave: "mision-vision",
    titulo: "Misión y visión",
    orden: 2,
    activa: true,
    contenido: {
      antetitulo: null,
      tituloPagina: "Libros y recursos educativos",
      tituloDestacado: "que transforman vidas",
      parrafos: "Contenido de calidad que inspira, educa y construye un mejor futuro.",
      imagenUrl: "/lineas/institucional-hero.jpg",
      imagenAlt:
        "Tres estudiantes leyendo y trabajando juntos con una tableta y libros sobre la mesa",
      // La pieza no pone encabezado sobre la tira de cuatro valores y no se
      // inventa uno: el titular de esa zona queda vacio y la pagina lo omite
      // (el nombre accesible de la seccion lo pone un encabezado oculto). El
      // cliente puede escribirlo desde /admin/paginas cuando quiera.
      bloquesAntetitulo: null,
      bloquesTitulo: null,
      cierreTexto: null,
      cierreDestacado: null,
    },
    secciones: [
      {
        titulo: "Misión",
        texto:
          "Somos una editorial especializada en ofrecer productos y servicios educativos que responden a las necesidades de la comunidad educativa, contribuyendo a la formación integral de niños y adolescentes, promoviendo valores como la disciplina, el respeto y la honestidad, fortaleciendo la educación y la familia como pilares de la sociedad.",
        destacado:
          "Impulsar el conocimiento y desarrollo de niños, niñas y jóvenes mediante una sólida formación en valores.",
      },
      {
        titulo: "Visión",
        // Las dos vinetas de la pieza van como parrafos: ver la nota de arriba.
        texto: [
          "Ser una editorial líder a nivel nacional e internacional, reconocida por la creación de contenidos impresos y digitales de alta calidad, que brinden soluciones integrales para las escuelas y la comunidad educativa en el mercado latinoamericano.",
          "Promover la educación en valores como eje transversal en todas las áreas curriculares.",
          "Aspiramos a contribuir al desarrollo de la sociedad, ofreciendo materiales que aporten a la formación integral en valores de las personas y mejoren su calidad de vida.",
        ].join("\n\n"),
        destacado: null,
      },
    ],
    valores: [
      {
        titulo: "Contenidos de calidad",
        texto: "Materiales impresos y digitales cuidados en fondo y forma.",
      },
      {
        titulo: "Formación integral de niños y jóvenes",
        texto: "Propuestas que acompañan el desarrollo personal, social y académico.",
      },
      {
        titulo: "Valores que transforman",
        texto: "La educación en valores como eje transversal de cada publicación.",
      },
      {
        titulo: "Impacto en la comunidad",
        texto: "Soluciones integrales para las escuelas y la comunidad educativa.",
      },
    ],
  },
  {
    clave: "compromiso",
    titulo: "Compromiso",
    orden: 3,
    activa: true,
    contenido: {
      antetitulo: "Compromiso",
      tituloPagina: "Nuestro compromiso con",
      tituloDestacado: "la comunidad educativa.",
      parrafos:
        "En Human Touch Books asumimos compromisos concretos con los estudiantes, los docentes y las familias: educar en valores, acompañar la labor del maestro y actuar con integridad en cada publicación.",
      imagenUrl: "/lineas/compromiso-hero.jpg",
      imagenAlt:
        "Logotipo de Human Touch Books con el lema «Inspiramos conocimiento, transformamos vidas» sobre un escritorio con libros",
      bloquesAntetitulo: "Nuestro compromiso",
      bloquesTitulo: "Compromisos que guían nuestro trabajo",
      cierreTexto: "Publicaciones educativas de calidad y apoyo integral a docentes y estudiantes:",
      cierreDestacado: "comprometidos con la formación de mejores personas.",
    },
    secciones: [],
    valores: [
      {
        titulo: "Educación en valores",
        texto:
          "Proponemos que los estudiantes aprendan principios éticos y normas que guíen su comportamiento y convivencia con los demás. No se trata solo de adquirir conocimientos académicos, sino de formar el carácter y la manera de actuar en la vida cotidiana.",
      },
      {
        titulo: "Soporte al docente",
        texto:
          "Facilitamos el trabajo de los maestros con recursos digitales —videos, actividades y evaluaciones— disponibles en la plataforma HTB.",
      },
      {
        titulo: "Integridad y ética",
        texto:
          "Actuamos con profesionalismo, rigor, disciplina, honestidad intelectual y respeto a la propiedad intelectual.",
      },
    ],
  },
];

/** Medidas reales del archivo: reservan su hueco exacto en la pagina (CLS cero). */
async function medidasDe(rutaPublica) {
  const { width, height } = await sharp(join(RAIZ, "public", rutaPublica)).metadata();
  if (!width || !height) throw new Error(`No pudimos leer las medidas de ${rutaPublica}`);
  return { ancho: width, alto: height };
}

async function main() {
  const existentes = await prisma.paginaInstitucional.count();
  if (existentes > 0) {
    console.log(
      `Ya hay ${existentes} página(s) institucional(es) cargadas. No se toca nada.\n` +
        "Si quieres volver a sembrar, borra las páginas desde /admin/paginas primero.",
    );
    return;
  }

  for (const pagina of PAGINAS) {
    const { contenido, secciones, valores } = pagina;

    let medidas = { ancho: null, alto: null };
    if (contenido?.imagenUrl) medidas = await medidasDe(contenido.imagenUrl);

    const creada = await prisma.paginaInstitucional.create({
      data: {
        clave: pagina.clave,
        titulo: pagina.titulo,
        orden: pagina.orden,
        activa: pagina.activa,
        ...(contenido ?? {}),
        ...medidas,
        secciones: {
          create: secciones.map((seccion, posicion) => ({
            titulo: seccion.titulo,
            texto: seccion.texto,
            destacado: seccion.destacado,
            orden: posicion + 1,
          })),
        },
        bloques: {
          create: valores.map((valor, posicion) => ({
            titulo: valor.titulo,
            texto: valor.texto,
            orden: posicion + 1,
          })),
        },
      },
    });

    console.log(
      `${pagina.activa ? "Publicada" : "Despublicada"}: /nosotros/${creada.clave} ` +
        `(${secciones.length} sección/es, ${valores.length} valor/es)`,
    );
  }

  console.log("\nListo. Revisa /admin/paginas.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
