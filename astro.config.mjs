// @ts-check
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  // Dominio CANONICO del sitio. De aqui salen el canonical, og:url, og:image, el
  // sitemap, robots.txt y el JSON-LD, y el middleware redirige `www.` hacia el.
  // Tiene que ser el dominio que de verdad resuelve: mientras dijo
  // humantouchbooks.pe (que nunca existio) todo el sitio le declaraba a Google
  // que su version oficial estaba en un dominio muerto.
  site: "https://editorialhtb.com",
  output: "server",
  adapter: node({ mode: "standalone" }),
  // El chequeo nativo compara contra una URL que el adapter reconstruye mal
  // detras del proxy (origen "http://localhost"), bloqueando todo formulario.
  // La validacion de origen se hace en src/middleware.ts con las cabeceras.
  security: { checkOrigin: false },
  vite: {
    plugins: [tailwindcss()],
  },
});
