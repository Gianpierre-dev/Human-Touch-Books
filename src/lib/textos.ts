// Catalogo de textos comerciales de la landing: los titulares, antetitulos,
// parrafos y botones que el panel puede reescribir desde /admin/textos.
//
// REGLA (la misma que ya usan `hero_subtitulo` y `nosotros_texto` en Ajuste):
// el valor por defecto vive SOLO aqui, nunca en la base. El panel muestra el
// campo VACIO con el defecto como `placeholder`, y vaciarlo borra la fila para
// que la web vuelva al original. Si el defecto se sembrara en la base, cualquier
// retoque del copy en el codigo quedaria tapado por una fila vieja para siempre.
//
// Fuera del catalogo, a proposito: etiquetas y mensajes del formulario de
// contacto, textos de accesibilidad (aria-label, sr-only) y el copy del panel.
// Son microcopy funcional: cambiarlos rompe usabilidad y accesibilidad, y no es
// contenido comercial que el cliente vaya a querer editar.

/**
 * Secciones del formulario del panel. El orden es el de la propia landing, con
 * dos excepciones que no son secciones suyas: «Menú y pie» va primero porque la
 * cabecera esta sobre todo lo demas y se repite en todas las paginas, y los
 * grupos que no pertenecen a la landing («Páginas de línea», «Metadatos») van al
 * final.
 */
export const GRUPOS_TEXTO = [
  {
    id: "navegacion",
    titulo: "Menú y pie",
    ayuda:
      "Etiquetas fijas del menú de la cabecera y de las columnas del pie. Se ven en todas las páginas. Las páginas y las líneas que cuelgan de cada desplegable se administran en sus propias pantallas.",
  },
  {
    id: "portada",
    titulo: "Portada",
    ayuda: "El bloque azul de arriba, con el titular y los dos botones principales.",
  },
  {
    id: "propuesta",
    titulo: "Propuesta",
    ayuda: "Encabezado de la franja «Qué aporta Tutoría SMART».",
  },
  {
    id: "coleccion",
    titulo: "Colección",
    ayuda: "Encabezado de la grilla de textos escolares.",
  },
  {
    id: "plan-lector",
    titulo: "Plan Lector",
    ayuda: "Encabezado de la línea de literatura.",
  },
  {
    id: "plataforma",
    titulo: "Plataforma",
    ayuda: "Sección de la plataforma Tutoría SMART.",
  },
  {
    id: "nosotros",
    titulo: "Nosotros",
    ayuda: "Presentación de la editorial y ficha del respaldo académico.",
  },
  {
    id: "preguntas",
    titulo: "Preguntas frecuentes",
    ayuda: "Encabezado de la sección. Las preguntas se administran en su propia pantalla.",
  },
  {
    id: "contacto",
    titulo: "Contacto",
    ayuda: "Encabezado de la sección de contacto y título del formulario.",
  },
  {
    id: "cierre",
    titulo: "Cierre",
    ayuda: "Franja azul del final, antes del pie de página.",
  },
  {
    id: "pie",
    titulo: "Pie de página",
    ayuda: "Texto de presentación que acompaña al logotipo.",
  },
  {
    id: "lineas",
    titulo: "Páginas de línea",
    ayuda:
      "Textos de las páginas /lineas/… que son iguales para las tres. El contenido propio de cada línea se edita en su ficha.",
  },
  {
    id: "metadatos",
    titulo: "Metadatos",
    ayuda: "No se ven en la página: los usan Google y las vistas previas al compartir el enlace.",
  },
] as const;

export type GrupoTexto = (typeof GRUPOS_TEXTO)[number]["id"];

/**
 * Datos que ya se administran en otra pantalla y de los que depende algun texto
 * por defecto. Se pasan al resolver para que el panel muestre exactamente el
 * mismo placeholder que la web esta usando.
 */
export interface ContextoTextos {
  /** Línea bajo el título de la colección, armada con el catálogo de libros. */
  descripcionColeccion: string;
}

export interface CampoTexto {
  clave: string;
  grupo: GrupoTexto;
  etiqueta: string;
  ayuda: string;
  /** Maximo de caracteres. Lo espeja el `maxlength` y lo valida el servidor. */
  limite: number;
  /** Se pinta como textarea en vez de input. */
  multilinea?: boolean;
  /**
   * Texto que la web muestra mientras no haya uno propio. Es funcion cuando se
   * calcula con datos que tambien se administran (el catalogo de libros).
   */
  defecto: string | ((contexto: ContextoTextos) => string);
}

// TEXTOS CON MARCADO INTERNO
// Dos textos de la web llevan marcado por dentro: el respaldo de la portada
// resalta el nombre en negrita y el titulo de contacto pinta la ultima palabra
// en azul. No se admite HTML escrito por el cliente (seria una via de inyeccion
// y un formato imposible de validar), asi que cada uno se parte en los campos
// que el marcado separa: el resaltado es un campo propio y la landing lo envuelve
// con la etiqueta correspondiente. El resultado renderizado es identico y el
// cliente edita texto plano.
export const CAMPOS_TEXTO = [
  // Menú y pie
  //
  // Los resuelve `cargarNavegacion()` (src/lib/navegacion.ts), no cada pagina:
  // ver la nota de ese archivo.
  {
    clave: "nav_inicio",
    grupo: "navegacion",
    etiqueta: "Menú — Inicio",
    ayuda: "Primer enlace del menú, tanto en la barra como en el cajón del móvil.",
    limite: 20,
    defecto: "Inicio",
  },
  {
    clave: "nav_nosotros",
    grupo: "navegacion",
    etiqueta: "Menú — desplegable de páginas",
    ayuda: "Agrupa las páginas institucionales. Sin páginas activas no se muestra.",
    limite: 30,
    defecto: "Nosotros",
  },
  {
    clave: "nav_textos",
    grupo: "navegacion",
    etiqueta: "Menú — desplegable de líneas",
    ayuda: "Agrupa las líneas del catálogo. Sin líneas activas no se muestra.",
    limite: 40,
    defecto: "Nuestros textos educativos",
  },
  {
    clave: "nav_contacto",
    grupo: "navegacion",
    etiqueta: "Menú — Contacto",
    ayuda: "Último enlace del menú. Lleva al formulario de la portada.",
    limite: 20,
    defecto: "Contacto",
  },
  {
    clave: "pie_explora",
    grupo: "navegacion",
    etiqueta: "Pie — título de la columna de enlaces",
    ayuda: "Encabeza la lista de páginas y líneas del pie.",
    limite: 30,
    defecto: "Explora",
  },
  {
    clave: "pie_contacto",
    grupo: "navegacion",
    etiqueta: "Pie — título de la columna de datos",
    ayuda: "Encabeza el WhatsApp, el correo y la ubicación del pie.",
    limite: 30,
    defecto: "Contacto",
  },
  {
    clave: "pie_preguntas",
    grupo: "navegacion",
    etiqueta: "Pie — enlace a preguntas frecuentes",
    ayuda: "Cierra la columna «Explora». Lleva a la sección de la portada.",
    limite: 40,
    defecto: "Preguntas frecuentes",
  },

  // Portada
  {
    clave: "portada_insignia",
    grupo: "portada",
    etiqueta: "Etiqueta superior",
    ayuda: "Pastilla pequeña sobre el titular.",
    limite: 30,
    defecto: "Proyecto",
  },
  {
    clave: "portada_titulo_1",
    grupo: "portada",
    etiqueta: "Titular — primera línea",
    ayuda: "Primera línea del titular, en blanco. Se muestra tal como la escribas.",
    limite: 40,
    defecto: "TUTORÍA SMART",
  },
  {
    clave: "portada_titulo_2",
    grupo: "portada",
    etiqueta: "Titular — segunda línea",
    ayuda: "Va debajo, resaltada en celeste. Pensada para el año.",
    limite: 12,
    defecto: "2027",
  },
  {
    clave: "portada_parrafo",
    grupo: "portada",
    etiqueta: "Párrafo de presentación",
    ayuda: "Descripción breve del proyecto, bajo el subtítulo.",
    limite: 260,
    multilinea: true,
    defecto:
      "Programa de tutoría y convivencia escolar diseñado para fortalecer habilidades socioemocionales, liderazgo y proyecto de vida.",
  },
  {
    clave: "portada_respaldo_antes",
    grupo: "portada",
    etiqueta: "Respaldo — texto antes del nombre",
    ayuda: "Línea con el escudo, al pie de la portada.",
    limite: 60,
    defecto: "Con el respaldo académico de",
  },
  {
    clave: "portada_respaldo_nombre",
    grupo: "portada",
    etiqueta: "Respaldo — nombre destacado",
    ayuda: "Se muestra en negrita dentro de esa misma línea.",
    limite: 60,
    defecto: "Rafael Bisquerra Alzina",
  },
  {
    clave: "portada_respaldo_despues",
    grupo: "portada",
    etiqueta: "Respaldo — texto después del nombre",
    ayuda: "Cierra la frase. Empieza con coma porque continúa después del nombre.",
    limite: 120,
    defecto: ", referente internacional en educación emocional.",
  },
  {
    clave: "portada_cta_primario",
    grupo: "portada",
    etiqueta: "Botón principal",
    ayuda: "Botón blanco. Lleva al formulario de contacto.",
    limite: 30,
    defecto: "Solicitar información",
  },
  {
    clave: "portada_cta_secundario",
    grupo: "portada",
    etiqueta: "Botón secundario",
    ayuda: "Botón con borde. Lleva a la colección.",
    limite: 30,
    defecto: "Conocer la colección",
  },

  // Propuesta
  {
    clave: "propuesta_antetitulo",
    grupo: "propuesta",
    etiqueta: "Antetítulo",
    ayuda: "Línea pequeña en mayúsculas sobre el título.",
    limite: 40,
    defecto: "La propuesta",
  },
  {
    clave: "propuesta_titulo",
    grupo: "propuesta",
    etiqueta: "Título",
    ayuda: "Encabeza los cuatro bloques de la sección.",
    limite: 80,
    defecto: "Qué aporta Tutoría SMART a tu institución",
  },

  // Colección
  {
    clave: "coleccion_antetitulo",
    grupo: "coleccion",
    etiqueta: "Antetítulo",
    ayuda: "Línea pequeña en mayúsculas sobre el título.",
    limite: 40,
    defecto: "Textos escolares",
  },
  {
    clave: "coleccion_titulo",
    grupo: "coleccion",
    etiqueta: "Título",
    ayuda: "Encabeza la grilla de portadas.",
    limite: 60,
    defecto: "Colección Tutoría SMART",
  },
  {
    clave: "coleccion_descripcion",
    grupo: "coleccion",
    etiqueta: "Descripción",
    ayuda:
      "Línea bajo el título. Si la dejas vacía se arma sola con el subtítulo y los grados del catálogo de libros.",
    limite: 220,
    multilinea: true,
    defecto: (contexto: ContextoTextos) => contexto.descripcionColeccion,
  },
  {
    clave: "coleccion_cta",
    grupo: "coleccion",
    etiqueta: "Botón",
    ayuda: "Botón azul al final de la grilla. Lleva al formulario.",
    limite: 50,
    defecto: "Solicitar información de la colección",
  },

  // Plan Lector
  {
    clave: "plan_lector_antetitulo",
    grupo: "plan-lector",
    etiqueta: "Antetítulo",
    ayuda: "Línea pequeña en mayúsculas sobre el título.",
    limite: 40,
    defecto: "Línea de literatura",
  },
  {
    clave: "plan_lector_titulo",
    grupo: "plan-lector",
    etiqueta: "Título",
    ayuda: "Encabeza los libros de la línea de literatura.",
    limite: 60,
    defecto: "Plan Lector",
  },

  // Plataforma
  {
    clave: "plataforma_insignia",
    grupo: "plataforma",
    etiqueta: "Etiqueta superior",
    ayuda: "Pastilla azul con estrella, sobre el título.",
    limite: 40,
    defecto: "Plataforma exclusiva",
  },
  {
    clave: "plataforma_titulo_1",
    grupo: "plataforma",
    etiqueta: "Título — primera línea",
    ayuda: "Se muestra en color oscuro.",
    limite: 40,
    defecto: "Plataforma",
  },
  {
    clave: "plataforma_titulo_2",
    grupo: "plataforma",
    etiqueta: "Título — segunda línea",
    ayuda: "Va debajo, resaltada en azul.",
    limite: 40,
    defecto: "TUTORÍA SMART",
  },
  {
    clave: "plataforma_parrafo",
    grupo: "plataforma",
    etiqueta: "Párrafo",
    ayuda: "Texto con barra azul a la izquierda, bajo el título.",
    limite: 260,
    multilinea: true,
    defecto:
      "Un espacio diseñado para docentes, directores, padres de familia y alumnos: recursos educativos, comunicación eficiente y un entorno seguro.",
  },
  {
    clave: "plataforma_aviso",
    grupo: "plataforma",
    etiqueta: "Aviso junto al botón",
    ayuda: "Nota con escudo, a la derecha del botón.",
    limite: 160,
    multilinea: true,
    defecto: "La plataforma se habilita para las instituciones que trabajan con la editorial.",
  },
  {
    clave: "plataforma_cta",
    grupo: "plataforma",
    etiqueta: "Botón",
    ayuda: "Botón degradado. Lleva al formulario de contacto.",
    limite: 30,
    defecto: "Solicitar acceso",
  },

  // Nosotros
  {
    clave: "nosotros_antetitulo",
    grupo: "nosotros",
    etiqueta: "Antetítulo",
    ayuda: "Línea pequeña en mayúsculas sobre el título.",
    limite: 40,
    defecto: "Nosotros",
  },
  {
    clave: "nosotros_titulo",
    grupo: "nosotros",
    etiqueta: "Título",
    ayuda: "El párrafo que va debajo se edita en Ajustes del sitio.",
    limite: 80,
    defecto: "Una editorial peruana que pone lo humano en el centro",
  },
  {
    clave: "nosotros_etiqueta_respaldo",
    grupo: "nosotros",
    etiqueta: "Respaldo — antetítulo",
    ayuda: "Línea pequeña en mayúsculas en la tarjeta del retrato.",
    limite: 40,
    defecto: "Respaldo académico",
  },
  {
    clave: "nosotros_nombre_respaldo",
    grupo: "nosotros",
    etiqueta: "Respaldo — nombre",
    ayuda: "Título de la tarjeta, junto al retrato.",
    limite: 60,
    defecto: "Rafael Bisquerra Alzina",
  },
  {
    clave: "nosotros_cita_respaldo",
    grupo: "nosotros",
    etiqueta: "Respaldo — frase destacada",
    ayuda: "Cita con barra azul a la izquierda.",
    limite: 200,
    multilinea: true,
    defecto:
      "Uno de los principales referentes internacionales en el ámbito de la educación emocional.",
  },
  {
    clave: "nosotros_parrafo_respaldo_1",
    grupo: "nosotros",
    etiqueta: "Respaldo — primer párrafo",
    ayuda: "Trayectoria académica.",
    limite: 400,
    multilinea: true,
    defecto:
      "Psicólogo, pedagogo e investigador español. Doctor en Ciencias de la Educación por la Universidad de Barcelona y fundador del Grupo de Investigación en Orientación Psicopedagógica (GROP).",
  },
  {
    clave: "nosotros_parrafo_respaldo_2",
    grupo: "nosotros",
    etiqueta: "Respaldo — segundo párrafo",
    ayuda: "Publicaciones e influencia.",
    limite: 400,
    multilinea: true,
    defecto:
      "Es autor de numerosas publicaciones sobre inteligencia emocional, competencias emocionales y bienestar. Sus aportes han influido en la incorporación de la educación emocional en instituciones educativas de España y América Latina.",
  },

  // Preguntas frecuentes
  {
    clave: "preguntas_antetitulo",
    grupo: "preguntas",
    etiqueta: "Antetítulo",
    ayuda: "Línea pequeña en mayúsculas sobre el título.",
    limite: 40,
    defecto: "Antes de escribir",
  },
  {
    clave: "preguntas_titulo",
    grupo: "preguntas",
    etiqueta: "Título",
    ayuda: "Encabeza la lista de preguntas desplegables.",
    limite: 60,
    defecto: "Preguntas frecuentes",
  },

  // Contacto
  {
    clave: "contacto_antetitulo",
    grupo: "contacto",
    etiqueta: "Antetítulo",
    ayuda: "Línea pequeña en mayúsculas sobre el título.",
    limite: 40,
    defecto: "Contáctanos",
  },
  {
    clave: "contacto_titulo_1",
    grupo: "contacto",
    etiqueta: "Título — texto normal",
    ayuda: "Primera parte del título, en color oscuro.",
    limite: 40,
    defecto: "Estamos aquí para",
  },
  {
    clave: "contacto_titulo_2_destacado",
    grupo: "contacto",
    etiqueta: "Título — palabra destacada",
    ayuda: "Cierra el título y se muestra en azul.",
    limite: 30,
    defecto: "ayudarte",
  },
  {
    clave: "contacto_parrafo",
    grupo: "contacto",
    etiqueta: "Párrafo",
    ayuda: "Texto bajo el título, antes de los datos de contacto.",
    limite: 200,
    multilinea: true,
    defecto: "Déjanos tu mensaje y te responderemos lo antes posible.",
  },
  {
    clave: "contacto_etiqueta_panel",
    grupo: "contacto",
    etiqueta: "Datos — título del recuadro",
    ayuda: "Encabeza el recuadro con el correo, el WhatsApp, el horario y la ubicación.",
    limite: 40,
    defecto: "Información de contacto",
  },
  {
    clave: "contacto_etiqueta_correo",
    grupo: "contacto",
    etiqueta: "Datos — etiqueta del correo",
    ayuda: "Va sobre la dirección de correo. La dirección se edita en Ajustes del sitio.",
    limite: 30,
    defecto: "Correo electrónico",
  },
  {
    clave: "contacto_etiqueta_whatsapp",
    grupo: "contacto",
    etiqueta: "Datos — etiqueta del WhatsApp",
    ayuda: "Va sobre el número. El número se edita en Ajustes del sitio.",
    limite: 30,
    defecto: "Celular · WhatsApp",
  },
  {
    clave: "contacto_etiqueta_horario",
    grupo: "contacto",
    etiqueta: "Datos — etiqueta del horario",
    ayuda: "Va sobre los horarios de atención, que se editan en Ajustes del sitio.",
    limite: 30,
    defecto: "Horario de atención",
  },
  {
    clave: "contacto_etiqueta_ubicacion",
    grupo: "contacto",
    etiqueta: "Datos — etiqueta de la ubicación",
    ayuda: "Va sobre la dirección, que se edita en Ajustes del sitio.",
    limite: 30,
    defecto: "Ubicación",
  },
  {
    clave: "contacto_titulo_formulario",
    grupo: "contacto",
    etiqueta: "Título del formulario",
    ayuda: "Encabeza la tarjeta del formulario. Las etiquetas de los campos no se editan.",
    limite: 40,
    defecto: "Envíanos tu mensaje",
  },

  // Cierre
  {
    clave: "cierre_titulo",
    grupo: "cierre",
    etiqueta: "Título",
    ayuda: "Pregunta que cierra la página.",
    limite: 80,
    defecto: "¿Quieres Tutoría SMART en tu colegio?",
  },
  {
    clave: "cierre_parrafo",
    grupo: "cierre",
    etiqueta: "Párrafo",
    ayuda: "Texto bajo el título.",
    limite: 200,
    multilinea: true,
    defecto: "Cuéntanos qué necesitas y te enviamos la información de la colección.",
  },
  {
    clave: "cierre_cta",
    grupo: "cierre",
    etiqueta: "Botón",
    ayuda: "Botón blanco. El de WhatsApp no se edita: se arma con el número de Ajustes.",
    limite: 30,
    defecto: "Solicitar información",
  },

  // Pie de página
  {
    clave: "pie_descripcion",
    grupo: "pie",
    etiqueta: "Descripción de la editorial",
    ayuda: "Párrafo bajo el logotipo del pie de página.",
    limite: 260,
    multilinea: true,
    defecto:
      "Editorial peruana que pone lo humano en el centro de cada página. Textos escolares y literatura que acompañan a crecer.",
  },

  // Páginas de línea
  {
    clave: "linea_vacio",
    grupo: "lineas",
    etiqueta: "Aviso cuando la línea no tiene títulos",
    ayuda:
      "Reemplaza a la grilla de portadas mientras la línea no tiene libros cargados. El botón que lo acompaña no se edita.",
    limite: 200,
    multilinea: true,
    defecto:
      "Los títulos de esta línea están en preparación. Escríbenos y te avisamos apenas estén disponibles.",
  },

  // Metadatos
  {
    clave: "meta_titulo",
    grupo: "metadatos",
    etiqueta: "Título de la página",
    ayuda: "Aparece en la pestaña del navegador y como titular en Google.",
    limite: 70,
    defecto: "Tutoría SMART 2027 — Human Touch Books",
  },
  {
    clave: "meta_descripcion",
    grupo: "metadatos",
    etiqueta: "Descripción para buscadores",
    ayuda: "Resumen que Google muestra bajo el título. Entre 120 y 160 caracteres funciona mejor.",
    limite: 170,
    multilinea: true,
    defecto:
      "Proyecto Tutoría SMART 2027: programa de tutoría y convivencia escolar para colegios y familias. Formación integral para una nueva generación.",
  },
] as const satisfies readonly CampoTexto[];

export type ClaveTexto = (typeof CAMPOS_TEXTO)[number]["clave"];

/** Todos los textos ya resueltos: el propio si existe, si no el por defecto. */
export type TextosResueltos = Record<ClaveTexto, string>;

const CAMPO_POR_CLAVE = new Map<string, CampoTexto>(
  CAMPOS_TEXTO.map((campo) => [campo.clave, campo]),
);

/** Devuelve el campo del catalogo, o `undefined` si la clave no existe. */
export function campoTexto(clave: string): CampoTexto | undefined {
  return CAMPO_POR_CLAVE.get(clave);
}

/** Texto que la web muestra cuando no hay valor propio guardado. */
export function valorPorDefecto(campo: CampoTexto, contexto: ContextoTextos): string {
  return typeof campo.defecto === "function" ? campo.defecto(contexto) : campo.defecto;
}

/**
 * Valor por defecto de un texto que no depende de datos administrables. Sirve
 * para los componentes que reciben el texto por props y solo necesitan una red
 * de seguridad; devuelve "" si la clave no existe o su defecto se calcula.
 */
export function defectoFijo(clave: ClaveTexto): string {
  const campo = CAMPO_POR_CLAVE.get(clave);
  if (!campo || typeof campo.defecto === "function") return "";
  return campo.defecto;
}

export interface FilaTexto {
  clave: string;
  valor: string;
}

/**
 * Mezcla las filas guardadas con el catalogo. Las claves que no esten en el
 * catalogo se ignoran (restos de una version anterior no pueden romper la web).
 */
export function resolverTextos(
  filas: readonly FilaTexto[],
  contexto: ContextoTextos,
): TextosResueltos {
  const propios = new Map(filas.map((fila) => [fila.clave, fila.valor]));
  // Se parte de un objeto vacio y el bucle lo completa con TODAS las claves del
  // catalogo: al terminar cumple el Record, pero TypeScript no puede probarlo
  // durante el llenado.
  const resueltos = {} as TextosResueltos;
  for (const campo of CAMPOS_TEXTO) {
    resueltos[campo.clave] = propios.get(campo.clave) ?? valorPorDefecto(campo, contexto);
  }
  return resueltos;
}

/**
 * Linea bajo el titulo de la coleccion cuando no se personaliza: se arma con el
 * subtitulo comun de la serie y el rango de grados del catalogo de libros, para
 * que siga al dia si se agregan o quitan titulos.
 */
export function descripcionColeccionPorDefecto(
  subtituloSerie: string,
  primerGrado: string | undefined,
  ultimoGrado: string | undefined,
): string {
  if (!subtituloSerie) return "";
  const rango =
    primerGrado && ultimoGrado ? ` Un texto por grado, de ${primerGrado} a ${ultimoGrado}.` : "";
  return `${subtituloSerie}.${rango}`;
}
