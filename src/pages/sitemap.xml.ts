// Sitemap del sitio publico, generado en cada peticion.
//
// POR QUE DINAMICO Y NO UN ARCHIVO EN /public
// Las lineas y las paginas institucionales se dan de alta y se activan desde el
// panel. Un archivo estatico quedaria desfasado el dia que el cliente publique
// una pagina nueva, y peor: seguiria anunciando las que desactive.
//
// SOLO ENTRA LO PUBLICADO
// Se listan las filas con `activa: true`. Una linea o una pagina desactivada
// responde 404, asi que anunciarla seria mandar a Google a una URL muerta.
//
// LAS URL SE ARMAN CON EL `site` DE astro.config.mjs
// Detras del proxy de Railway el adapter descarta Host y X-Forwarded-Host, y
// `url.origin` resuelve a "http://localhost:4321". El sitemap tiene que llevar
// URL absolutas del dominio real, asi que la base es `site` y solo cae al
// origen de la peticion si el config no lo define.
import type { APIRoute } from "astro";
import { bd } from "../lib/bd";

export const prerender = false;

/** Paginas que no viven en la base: existen mientras exista el sitio. */
const RUTAS_FIJAS = ["/", "/privacidad"] as const;

interface EntradaSitemap {
  ruta: string;
  /** Fecha del ultimo cambio. Solo la traen las paginas administrables. */
  actualizadoEn?: Date;
}

/** Escapa los cinco caracteres que XML reserva. */
function escaparXml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function entradaXml(entrada: EntradaSitemap, base: URL): string {
  const url = escaparXml(new URL(entrada.ruta, base).href);
  // Sin `changefreq` ni `priority`: son declaraciones que los buscadores
  // ignoran y que aqui solo se podrian inventar.
  const lastmod = entrada.actualizadoEn
    ? `\n    <lastmod>${entrada.actualizadoEn.toISOString()}</lastmod>`
    : "";
  return `  <url>\n    <loc>${url}</loc>${lastmod}\n  </url>`;
}

export const GET: APIRoute = async ({ site, url }) => {
  const base = site ?? new URL(url.origin);

  const [lineas, paginas] = await Promise.all([
    bd.linea.findMany({
      where: { activa: true },
      orderBy: [{ orden: "asc" }, { creadoEn: "asc" }],
      select: { clave: true, actualizadoEn: true },
    }),
    bd.paginaInstitucional.findMany({
      where: { activa: true },
      orderBy: [{ orden: "asc" }, { creadoEn: "asc" }],
      select: { clave: true, actualizadoEn: true },
    }),
  ]);

  const entradas: EntradaSitemap[] = [
    ...RUTAS_FIJAS.map((ruta) => ({ ruta })),
    ...lineas.map((linea) => ({
      ruta: `/lineas/${linea.clave}`,
      actualizadoEn: linea.actualizadoEn,
    })),
    ...paginas.map((pagina) => ({
      ruta: `/nosotros/${pagina.clave}`,
      actualizadoEn: pagina.actualizadoEn,
    })),
  ];

  const cuerpo = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entradas.map((entrada) => entradaXml(entrada, base)).join("\n")}
</urlset>
`;

  return new Response(cuerpo, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Una hora: el catalogo cambia pocas veces al mes y el rastreador no
      // necesita el dato al segundo.
      "Cache-Control": "public, max-age=3600",
    },
  });
};
