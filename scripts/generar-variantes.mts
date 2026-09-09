// Genera las variantes responsivas de las imagenes que YA estaban subidas y
// completa las medidas que falten en la base.
//
//   node --experimental-strip-types --import ./pruebas/registrar-resolver.mjs scripts/generar-variantes.mts
//
// POR QUE HACE FALTA
// Desde ahora cada subida genera sus variantes sola (src/lib/almacen.ts), pero
// las imagenes que ya estaban en el bucket no tienen ninguna, y las filas
// anteriores a las columnas de medidas tampoco saben cuanto miden. Sin ese
// ancho no se puede publicar un `srcset` honesto, asi que la portada sigue
// mandando el original entero. Este script cierra las dos cosas de una vez.
//
// ES IDEMPOTENTE: volver a correrlo regenera las mismas variantes y reescribe
// las mismas medidas. No borra nada y no toca las imagenes del repositorio
// (`/mock/...`, `/lineas/...`), que no viven en el bucket.
//
// NO abre una transaccion: cada fila se atiende por su cuenta y un fallo suelto
// no impide que las demas se completen. El resumen final dice cuales quedaron
// pendientes y el proceso sale con codigo 1 para que se note.

// El .env se carga a mano y ANTES que nada: `node` no lo lee solo, y los modulos
// de src/ validan las variables de Wasabi en el momento de importarse. Por eso
// los imports de abajo son dinamicos: uno estatico se evaluaria antes que esto.
try {
  process.loadEnvFile();
} catch {
  // Sin archivo .env: se asume que las variables ya vienen del entorno.
}

// `@prisma/client` directo y no src/lib/bd.ts: ese modulo lee `import.meta.env`,
// que solo existe dentro de Vite.
const { PrismaClient } = await import("@prisma/client");
const { generarVariantes, obtenerPortada } = await import("../src/lib/almacen.ts");
const sharp = (await import("sharp")).default;

const PREFIJO_SUBIDAS = "/uploads/";

interface Objetivo {
  /** Tabla de la fila, solo para el informe. */
  tabla: string;
  url: string;
  /** Escribe en la fila que corresponda las medidas leidas del archivo. */
  guardarMedidas: (ancho: number, alto: number) => Promise<void>;
}

interface Fila {
  tabla: string;
  url: string;
  medidas: string;
  variantes: string;
}

const bd = new PrismaClient();

/** Solo las imagenes del bucket: las del repositorio no tienen que procesarse. */
function esSubida(url: string | null): url is string {
  return typeof url === "string" && url.startsWith(PREFIJO_SUBIDAS);
}

async function reunirObjetivos(): Promise<Objetivo[]> {
  // Las CINCO tablas con imagen administrable: las mismas que llaman a
  // `srcsetDe` en las paginas. Si una pagina nueva empieza a emitir `srcset`
  // desde otra tabla, hay que sumarla aqui, o sus filas con ancho cargado
  // prometerian variantes que nadie genero.
  const [heroes, sitios, libros, lineas, paginas] = await Promise.all([
    bd.imagenHero.findMany({ select: { id: true, imagenUrl: true, imagenMovilUrl: true } }),
    bd.imagenSitio.findMany({ select: { id: true, imagenUrl: true } }),
    bd.libro.findMany({ select: { id: true, portadaUrl: true } }),
    bd.linea.findMany({ select: { id: true, heroImagenUrl: true } }),
    bd.paginaInstitucional.findMany({ select: { id: true, imagenUrl: true } }),
  ]);

  const objetivos: Objetivo[] = [];

  for (const hero of heroes) {
    if (esSubida(hero.imagenUrl)) {
      objetivos.push({
        tabla: "ImagenHero",
        url: hero.imagenUrl,
        guardarMedidas: async (ancho, alto) => {
          await bd.imagenHero.update({ where: { id: hero.id }, data: { ancho, alto } });
        },
      });
    }
    // La version para celular (direccion de arte) es una imagen mas, con sus
    // propias variantes y medidas: sin este bucle, un relleno tras perder
    // objetos del bucket la dejaria prometiendo archivos que nadie regenero.
    if (esSubida(hero.imagenMovilUrl)) {
      objetivos.push({
        tabla: "ImagenHero (movil)",
        url: hero.imagenMovilUrl,
        guardarMedidas: async (ancho, alto) => {
          await bd.imagenHero.update({
            where: { id: hero.id },
            data: { movilAncho: ancho, movilAlto: alto },
          });
        },
      });
    }
  }

  for (const sitio of sitios) {
    if (!esSubida(sitio.imagenUrl)) continue;
    objetivos.push({
      tabla: "ImagenSitio",
      url: sitio.imagenUrl,
      guardarMedidas: async (ancho, alto) => {
        await bd.imagenSitio.update({ where: { id: sitio.id }, data: { ancho, alto } });
      },
    });
  }

  for (const libro of libros) {
    if (!esSubida(libro.portadaUrl)) continue;
    objetivos.push({
      tabla: "Libro",
      url: libro.portadaUrl,
      guardarMedidas: async (ancho, alto) => {
        await bd.libro.update({ where: { id: libro.id }, data: { ancho, alto } });
      },
    });
  }

  for (const linea of lineas) {
    if (!esSubida(linea.heroImagenUrl)) continue;
    objetivos.push({
      tabla: "Linea",
      url: linea.heroImagenUrl,
      guardarMedidas: async (ancho, alto) => {
        await bd.linea.update({
          where: { id: linea.id },
          data: { heroAncho: ancho, heroAlto: alto },
        });
      },
    });
  }

  for (const pagina of paginas) {
    if (!esSubida(pagina.imagenUrl)) continue;
    objetivos.push({
      tabla: "PaginaInstitucional",
      url: pagina.imagenUrl,
      guardarMedidas: async (ancho, alto) => {
        await bd.paginaInstitucional.update({ where: { id: pagina.id }, data: { ancho, alto } });
      },
    });
  }

  return objetivos;
}

/**
 * Descarga el original, lo mide, sube sus variantes y guarda las medidas.
 *
 * El orden importa: las medidas se escriben DESPUES de subir las variantes. Al
 * reves, un fallo del bucket dejaria la fila diciendo «mido 1600» —y por tanto
 * la pagina publicando un `srcset`— sin un solo archivo detras.
 */
async function procesar(objetivo: Objetivo): Promise<Fila> {
  const nombre = objetivo.url.slice(PREFIJO_SUBIDAS.length);

  // `obtenerPortada` devuelve null tanto si el objeto no existe como si fallo
  // la lectura (credenciales, red): el motivo real queda en el registro.
  const original = await obtenerPortada(nombre);
  if (!original) throw new Error("no se pudo leer del bucket (revisa el registro de arriba)");

  const bytes = Buffer.from(original.cuerpo);
  const { width, height } = await sharp(bytes).metadata();
  if (!width || !height) throw new Error("sharp no pudo leer las medidas del archivo");

  const anchos = await generarVariantes(bytes, width, nombre);
  await objetivo.guardarMedidas(width, height);

  return {
    tabla: objetivo.tabla,
    url: objetivo.url,
    medidas: `${width}x${height}`,
    variantes: anchos.length > 0 ? anchos.join(", ") : "ninguna (original angosto)",
  };
}

/** Tabla de ancho fijo por columna: alinear a mano se lee mejor que un volcado. */
function imprimirTabla(filas: Fila[]): void {
  const columnas = [
    { titulo: "Tabla", valor: (fila: Fila) => fila.tabla },
    { titulo: "Imagen", valor: (fila: Fila) => fila.url },
    { titulo: "Medidas", valor: (fila: Fila) => fila.medidas },
    { titulo: "Variantes", valor: (fila: Fila) => fila.variantes },
  ];

  const anchos = columnas.map((columna) =>
    Math.max(columna.titulo.length, ...filas.map((fila) => columna.valor(fila).length)),
  );
  const linea = (celdas: string[]) =>
    celdas.map((celda, i) => celda.padEnd(anchos[i] ?? 0)).join("  ");

  console.log(linea(columnas.map((columna) => columna.titulo)));
  console.log(anchos.map((ancho) => "-".repeat(ancho)).join("  "));
  for (const fila of filas) {
    console.log(linea(columnas.map((columna) => columna.valor(fila))));
  }
}

async function principal(): Promise<void> {
  const objetivos = await reunirObjetivos();
  if (objetivos.length === 0) {
    console.log("No hay imagenes subidas desde el panel: no hay nada que generar.");
    return;
  }

  console.log(`Imagenes a procesar: ${objetivos.length}\n`);

  const hechas: Fila[] = [];
  const fallidas: { url: string; motivo: string }[] = [];

  for (const objetivo of objetivos) {
    try {
      hechas.push(await procesar(objetivo));
    } catch (fallo) {
      const motivo = fallo instanceof Error ? fallo.message : String(fallo);
      fallidas.push({ url: objetivo.url, motivo });
    }
  }

  if (hechas.length > 0) imprimirTabla(hechas);

  console.log(`\nGeneradas: ${hechas.length} de ${objetivos.length}.`);
  const totalVariantes = hechas.reduce(
    (suma, fila) =>
      suma + (fila.variantes.startsWith("ninguna") ? 0 : fila.variantes.split(", ").length),
    0,
  );
  console.log(`Archivos WebP subidos: ${totalVariantes}.`);

  if (fallidas.length === 0) return;

  console.error(`\nFallaron ${fallidas.length}:`);
  for (const fallida of fallidas) {
    console.error(`  · ${fallida.url}: ${fallida.motivo}`);
  }
  // Codigo 1 para que un despliegue o una tarea encadenada no lo de por bueno.
  process.exitCode = 1;
}

try {
  await principal();
} finally {
  await bd.$disconnect();
}
