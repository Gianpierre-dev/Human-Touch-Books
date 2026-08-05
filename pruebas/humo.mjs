// Pruebas de humo del sitio publico.
//
//   node pruebas/humo.mjs                 (contra http://localhost:4321)
//   URL_BASE=http://localhost:4322 node pruebas/humo.mjs
//
// QUE COMPRUEBAN Y QUE NO
// No sustituyen a una suite de integracion: verifican que el servidor levanta,
// que cada ruta publica responde con el estado correcto y que la pagina trae la
// marca que la identifica. Es el minimo que hay que exigirle a un despliegue
// antes de darlo por bueno, y es lo que corre el CI contra el build real.
//
// NINGUN CASO ESCRIBE EN LA BASE DE DATOS
// El unico POST que se envia es el del formulario de contacto CON LA TRAMPA
// ANTISPAM LLENA: /api/contacto responde exito y sale sin insertar nada (asi
// despista al bot). Por eso estas pruebas se pueden correr contra cualquier
// entorno, produccion incluida, sin dejar rastro.
//
// Sin framework a proposito: el proyecto no tiene runner de pruebas y meter uno
// para diez peticiones seria mas dependencia que cobertura.

const URL_BASE = (process.env.URL_BASE ?? "http://localhost:4321").replace(/\/$/, "");

const resultados = [];

/** Registra un caso. `comprobar` lanza (o devuelve un texto) si algo no cuadra. */
async function caso(nombre, comprobar) {
  try {
    await comprobar();
    resultados.push({ nombre, ok: true });
    console.log(`  ✔ ${nombre}`);
  } catch (error) {
    resultados.push({ nombre, ok: false, motivo: error.message });
    console.log(`  ✘ ${nombre}`);
    console.log(`      ${error.message}`);
  }
}

function afirmar(condicion, motivo) {
  if (!condicion) throw new Error(motivo);
}

/**
 * Peticion sin seguir redirecciones: varios casos comprueban el 302/303 y su
 * destino, y con el modo automatico se perderian ambos.
 */
function pedir(ruta, opciones = {}) {
  return fetch(`${URL_BASE}${ruta}`, { redirect: "manual", ...opciones });
}

async function pagina(ruta) {
  const respuesta = await pedir(ruta);
  return { respuesta, cuerpo: await respuesta.text() };
}

function afirmarEstado(respuesta, esperado, ruta) {
  afirmar(
    respuesta.status === esperado,
    `${ruta} respondio ${respuesta.status}, se esperaba ${esperado}`,
  );
}

function afirmarContiene(cuerpo, fragmento, ruta) {
  afirmar(cuerpo.includes(fragmento), `${ruta} no contiene «${fragmento}»`);
}

/** Caso reutilizable: la ruta responde 200 y trae el fragmento indicado. */
function paginaViva(ruta, fragmento) {
  return async () => {
    const { respuesta, cuerpo } = await pagina(ruta);
    afirmarEstado(respuesta, 200, ruta);
    if (fragmento) afirmarContiene(cuerpo, fragmento, ruta);
  };
}

async function ejecutar() {
  console.log(`Pruebas de humo contra ${URL_BASE}\n`);

  console.log("Portada");
  await caso("/ responde 200 con la marca del proyecto", paginaViva("/", "Tutoría SMART"));
  await caso("/ publica el formulario de contacto", async () => {
    const { cuerpo } = await pagina("/");
    afirmarContiene(cuerpo, 'action="/api/contacto"', "/");
  });

  console.log("\nLineas de producto");
  await caso(
    "/lineas/primaria responde 200 con su catalogo",
    paginaViva("/lineas/primaria", "Tutoría SMART 1"),
  );
  await caso("/lineas/secundaria responde 200", paginaViva("/lineas/secundaria"));
  await caso("/lineas/lector responde 200", paginaViva("/lineas/lector"));

  console.log("\nPaginas institucionales");
  await caso("/nosotros/quienes-somos responde 200", paginaViva("/nosotros/quienes-somos"));
  await caso("/nosotros/mision-vision responde 200", paginaViva("/nosotros/mision-vision"));

  console.log("\nRutas fijas y rastreo");
  await caso("/privacidad responde 200", paginaViva("/privacidad"));
  await caso("/sitemap.xml responde 200 y es un urlset", async () => {
    const { respuesta, cuerpo } = await pagina("/sitemap.xml");
    afirmarEstado(respuesta, 200, "/sitemap.xml");
    const tipo = respuesta.headers.get("content-type") ?? "";
    afirmar(tipo.includes("xml"), `/sitemap.xml no se sirve como XML (content-type: ${tipo})`);
    afirmarContiene(cuerpo, "<urlset", "/sitemap.xml");
  });
  await caso("/robots.txt responde 200", paginaViva("/robots.txt"));

  console.log("\nSalud del servicio");
  await caso("/api/salud responde 200 con estado ok", async () => {
    const { respuesta, cuerpo } = await pagina("/api/salud");
    afirmarEstado(respuesta, 200, "/api/salud");
    const datos = JSON.parse(cuerpo);
    afirmar(
      datos.estado === "ok",
      `/api/salud devolvio estado «${datos.estado}», se esperaba «ok»`,
    );
  });

  console.log("\nRutas inexistentes");
  await caso("una ruta que no existe responde 404 con la marca", async () => {
    const ruta = "/esta-ruta-no-existe-jamas";
    const { respuesta, cuerpo } = await pagina(ruta);
    afirmarEstado(respuesta, 404, ruta);
    afirmarContiene(cuerpo, "Human Touch Books", ruta);
  });
  await caso("/nosotros/compromiso (despublicada) responde 404", async () => {
    const { respuesta } = await pagina("/nosotros/compromiso");
    afirmarEstado(respuesta, 404, "/nosotros/compromiso");
  });
  await caso("/500 responde 500 con la marca", async () => {
    const { respuesta, cuerpo } = await pagina("/500");
    afirmarEstado(respuesta, 500, "/500");
    afirmarContiene(cuerpo, "Human Touch Books", "/500");
  });

  console.log("\nPanel protegido");
  await caso("/admin sin sesion redirige al login", async () => {
    const respuesta = await pedir("/admin");
    afirmarEstado(respuesta, 302, "/admin");
    const destino = respuesta.headers.get("location") ?? "";
    afirmar(
      destino.includes("/admin/login"),
      `/admin redirige a «${destino}», se esperaba /admin/login`,
    );
  });
  await caso("POST /api/admin/mensajes/x sin sesion responde 401", async () => {
    const respuesta = await pedir("/api/admin/mensajes/x", { method: "POST" });
    afirmarEstado(respuesta, 401, "POST /api/admin/mensajes/x");
  });
  // Sin cuerpo: el middleware corta antes de leer el formulario, asi que el
  // caso no llega a crear ningun usuario.
  await caso("POST /api/admin/usuarios sin sesion responde 401", async () => {
    const respuesta = await pedir("/api/admin/usuarios", { method: "POST" });
    afirmarEstado(respuesta, 401, "POST /api/admin/usuarios");
  });

  console.log("\nFormulario de contacto (trampa antispam: NO escribe en la base)");
  await caso("POST /api/contacto con la trampa llena redirige a ?contacto=ok", async () => {
    const formulario = new FormData();
    // El campo oculto que solo rellena un bot. Con el lleno, el endpoint
    // responde exito y sale ANTES de tocar la base de datos.
    formulario.set("sitio_web", "https://ejemplo-de-bot.test");
    formulario.set("nombre", "Prueba de humo");
    formulario.set("correo", "humo@ejemplo.test");
    formulario.set("telefono", "999999999");
    formulario.set("asunto", "Colegios");
    formulario.set("mensaje", "Mensaje de prueba que nunca debe guardarse.");

    const respuesta = await pedir("/api/contacto", { method: "POST", body: formulario });
    afirmarEstado(respuesta, 303, "POST /api/contacto");
    const destino = respuesta.headers.get("location") ?? "";
    afirmar(
      destino.includes("contacto=ok"),
      `POST /api/contacto redirige a «${destino}», se esperaba ?contacto=ok`,
    );
  });

  const fallidos = resultados.filter((resultado) => !resultado.ok);
  const total = resultados.length;

  console.log("\n" + "-".repeat(60));
  if (fallidos.length === 0) {
    console.log(`✔ ${total}/${total} casos correctos.`);
    return 0;
  }

  console.log(`✘ ${fallidos.length} de ${total} casos fallaron:`);
  for (const fallido of fallidos) console.log(`  - ${fallido.nombre}: ${fallido.motivo}`);
  return 1;
}

ejecutar()
  .then((codigo) => {
    process.exitCode = codigo;
  })
  .catch((error) => {
    // Un fallo aqui no es un caso rojo: es que ni siquiera se pudo empezar
    // (servidor caido, URL_BASE mal, red). Conviene distinguirlo.
    console.error("\nNo se pudieron ejecutar las pruebas:", error.message);
    process.exitCode = 1;
  });
