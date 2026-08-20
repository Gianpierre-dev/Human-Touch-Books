// Resolvedor de modulos para las pruebas unitarias.
//
// POR QUE HACE FALTA
// Dentro de src/ los modulos se importan sin extension (`from "./orden"`),
// que es lo que Vite —y por tanto Astro— resuelve solo. Node, en cambio, exige
// la extension exacta, asi que al importar un modulo de `lib` que a su vez
// importe a otro, la prueba moria con ERR_MODULE_NOT_FOUND.
//
// Este resolvedor solo entra en accion cuando la resolucion normal FALLA, y
// unicamente para rutas relativas: no cambia como se resuelve nada que ya
// funcione, ni toca los paquetes de node_modules.
export async function resolve(especificador, contexto, siguiente) {
  try {
    return await siguiente(especificador, contexto);
  } catch (fallo) {
    const esRelativo = especificador.startsWith("./") || especificador.startsWith("../");
    if (!esRelativo || especificador.endsWith(".ts")) throw fallo;
    return siguiente(`${especificador}.ts`, contexto);
  }
}
