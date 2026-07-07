import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/*
  Un solo modelo de "libro" con una linea de producto.
  Contenido estructurado: manana se enchufa un CMS sin reescribir la web.
*/
const libros = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content" }),
  schema: z.object({
    titulo: z.string(),
    subtitulo: z.string().optional(),
    linea: z.enum(["escolar", "literatura"]),
    // Escolar
    grado: z.string().optional(), // "1ro Primaria"
    nivel: z.string().optional(), // "Primaria"
    // Literatura
    autor: z.string().optional(),
    ilustrador: z.string().optional(),
    anio: z.number().optional(),
    // Comunes
    sinopsis: z.string(),
    portada: z.string(), // ruta en /public/covers
    orden: z.number().default(0),
    destacado: z.boolean().default(false),
  }),
});

export const collections = { libros };
