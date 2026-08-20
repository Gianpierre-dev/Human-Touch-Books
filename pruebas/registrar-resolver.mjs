// Engancha el resolvedor de las pruebas (ver pruebas/resolver-ts.mjs).
// Se carga con `node --import ./pruebas/registrar-resolver.mjs`.
import { register } from "node:module";

register("./resolver-ts.mjs", import.meta.url);
