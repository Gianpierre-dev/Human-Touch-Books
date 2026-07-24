// @ts-check
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  site: "https://humantouchbooks.pe",
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
