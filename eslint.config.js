// Reglas de ESLint del proyecto.
//
// POR QUE UN CONJUNTO CORTO Y ELEGIDO A MANO
// Un preset entero (`recommended` de TypeScript o de Astro) trae decenas de
// reglas que TypeScript ya comprueba mejor —redeclaraciones, tipos imposibles,
// codigo inalcanzable— y otras tantas de estilo que Prettier ya decide. El
// resultado seria una lista de avisos que nadie lee y, peor, la costumbre de
// apagar reglas para poder trabajar.
//
// Aqui solo entran reglas que atrapan algo que HOY se nos escapa: promesas sin
// esperar, codigo muerto, ruido en los registros de produccion y errores propios
// del compilador de Astro. Si una regla no puede señalar un fallo real de este
// sitio, no va.
//
// Prettier sigue siendo el unico que opina de formato (`pnpm formato`), asi que
// las reglas de Astro que ordenan atributos, parten listas de clases o ponen
// punto y coma quedan FUERA a proposito: pelearian con el formateador.

import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import astro from "eslint-plugin-astro";

/** Reglas de TypeScript que necesitan tipos; valen igual en .ts y en .astro. */
const REGLAS_TIPOS = {
  // La que motivo todo esto: una promesa sin `await` ni `.catch()` se pierde en
  // silencio. Si falla, el rechazo no aparece en ningun sitio y la respuesta ya
  // se envio como si todo hubiera ido bien.
  "@typescript-eslint/no-floating-promises": [
    "error",
    {
      // `test()` de node:test devuelve una promesa que el runner ya espera por
      // su cuenta: esperarla a mano en cada caso no cambia nada y llenaria las
      // pruebas de `await` decorativos. Se permite POR NOMBRE Y ORIGEN, no
      // apagando la regla en pruebas/, para que una promesa de verdad suelta
      // dentro de un caso siga saltando.
      allowForKnownSafeCalls: [
        { from: "package", package: "node:test", name: ["test", "it", "describe"] },
      ],
    },
  ],

  // La otra mitad del mismo agujero: una funcion `async` pasada donde se espera
  // una que no devuelve nada (un manejador de eventos, un `filter`). Nadie
  // espera esa promesa y su fallo tampoco se ve.
  "@typescript-eslint/no-misused-promises": "error",

  // `await` sobre algo que no es una promesa casi siempre significa que falta
  // el parentesis de la llamada o que el metodo elegido no era el asincrono.
  "@typescript-eslint/await-thenable": "error",

  // El proyecto no acepta `any`: anula el chequeo de tipos justo donde mas
  // hace falta, en los datos que vienen de la base o del formulario.
  "@typescript-eslint/no-explicit-any": "error",
};

/** Reglas sin tipos: valen en .ts, en .astro y en los scripts .mjs. */
const REGLAS_COMUNES = {
  // Variables, importaciones y parametros que ya no se usan. El prefijo `_`
  // sirve para el caso legitimo: un parametro que hay que declarar por posicion
  // aunque no se lea.
  "@typescript-eslint/no-unused-vars": [
    "error",
    {
      argsIgnorePattern: "^_",
      varsIgnorePattern: "^_",
      caughtErrorsIgnorePattern: "^_",
      destructuredArrayIgnorePattern: "^_",
    },
  ],

  // `console.error` y `console.warn` son el registro de incidentes del sitio
  // (ver src/lib/registro.ts): en Railway van a los logs del despliegue y son
  // la unica forma de enterarse de un fallo. `console.log`, en cambio, es
  // siempre un resto de depuracion.
  "no-console": ["error", { allow: ["error", "warn"] }],
};

/** Reglas del compilador de Astro que Prettier no puede ver. */
const REGLAS_ASTRO = {
  // El compilador no arranca; sin esto el fallo aparece recien al construir.
  "astro/valid-compile": "error",

  // `set:html` y `set:text` sobre el mismo elemento, o junto a hijos: uno de
  // los dos se descarta en silencio.
  "astro/no-conflict-set-directives": "error",

  // Inyectar HTML sin escapar. Todo el contenido de este sitio es
  // administrable, asi que cada uso tiene que justificarse por escrito.
  "astro/no-set-html-directive": "error",

  // Una etiqueta sin cerrar (`<p>` suelto) que el navegador perdona pero el
  // compilador de Astro anida de otra manera, moviendo el resto del bloque.
  "astro/no-omitted-end-tags": "error",

  // `define:vars` declarado y nunca usado en el <style>: el estilo depende de
  // una variable que no existe.
  "astro/no-unused-define-vars-in-style": "error",

  // Exportar desde un componente no hace nada; quien lo importa recibe
  // `undefined` sin un solo aviso.
  "astro/no-exports-from-components": "error",

  // `client:only` sin framework: el componente no se hidrata nunca.
  "astro/missing-client-only-directive-value": "error",

  // NO se activa `astro/no-unsafe-inline-scripts`: marca TODO <script> sin
  // `src`, y los diez de este sitio son `is:inline` a proposito. Astro deja ese
  // bloque intacto —ni siquiera puede interpolar datos del servidor dentro—,
  // asi que no hay nada que escapar. La regla existe para proyectos que sirven
  // una CSP estricta con nonce; este no lo hace, y activarla solo dejaria diez
  // `eslint-disable` sin una razon detras.

  // `export const prerender` fuera de src/pages no lo lee nadie.
  "astro/no-prerender-export-outside-pages": "error",

  // APIs retiradas de Astro que hoy fallan en tiempo de ejecucion.
  "astro/no-deprecated-astro-canonicalurl": "error",
  "astro/no-deprecated-astro-fetchcontent": "error",
  "astro/no-deprecated-astro-resolve": "error",
  "astro/no-deprecated-getentrybyslug": "error",
};

export default defineConfig(
  {
    // Nada de esto lo escribimos nosotros o no es codigo del sitio.
    ignores: ["dist/", ".astro/", "node_modules/", "public/", "uploads/", "prisma/migrations/"],
  },

  // Solo registran el plugin y el analizador de cada lenguaje: las reglas se
  // eligen abajo, una por una. El orden importa — el bloque de Astro tiene que
  // ir despues para quedarse con el analizador de los .astro.
  tseslint.configs.base,
  ...astro.configs["flat/base"],

  {
    name: "htb/typescript",
    files: ["**/*.{ts,mts,mjs,js}"],
    languageOptions: {
      parserOptions: {
        // `projectService` toma el tsconfig del proyecto sin listar archivos a
        // mano: las reglas con tipos ven exactamente lo que ve `astro check`.
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: { ...REGLAS_COMUNES, ...REGLAS_TIPOS },
  },

  {
    name: "htb/astro",
    files: ["**/*.astro"],
    languageOptions: {
      parserOptions: {
        // `astro-eslint-parser` todavia no entiende `projectService`; con
        // `project` carga el mismo tsconfig y avisa una vez por archivo si se
        // le pasa el otro.
        project: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: [".astro"],
      },
    },
    rules: {
      ...REGLAS_COMUNES,
      ...REGLAS_TIPOS,
      ...REGLAS_ASTRO,

      // El analizador envuelve el frontmatter en una funcion sintetica cuyos
      // `return` no tienen nodo padre, y la regla revienta al mirarlos (todas
      // las paginas del panel hacen `return Astro.redirect(...)`). En .ts si
      // corre, que es donde estan los manejadores de la API.
      "@typescript-eslint/no-misused-promises": "off",
    },
  },

  {
    name: "htb/scripts",
    files: ["scripts/**", "pruebas/**", "prisma/*.mjs"],
    rules: {
      // Aqui `console.log` NO es un resto de depuracion: es la salida del
      // comando, lo unico que ve quien lo ejecuta desde la terminal.
      "no-console": "off",
    },
  },
);
