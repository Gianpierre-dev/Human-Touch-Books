// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  site: "https://humantouchbooks.pe",
  vite: {
    plugins: [tailwindcss()],
    preview: {
      // Sitio estatico publico servido por Railway: se sirve el mismo HTML a
      // cualquier host, no hay riesgo de rebinding, asi que se permite todo host.
      allowedHosts: true,
    },
  },
});
