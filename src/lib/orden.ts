// El campo `orden` de las listas administrables: como se lee del formulario y
// como se recalcula al mover un elemento.
//
// El import de Prisma es `import type` a proposito: las pruebas unitarias cargan
// este modulo con el stripping de tipos de Node, donde un import de valor haria
// evaluar el cliente generado.
//
// Intercambiar solo el campo `orden` con el vecino falla cuando dos filas
// comparten el mismo valor (pasa apenas se cargan dos elementos con el orden que
// trae el formulario por defecto). Por eso se mueve la posicion dentro de la
// lista ya ordenada y se renumera todo de forma consecutiva: el resultado es
// siempre estable, sin empates.

import type { Prisma, PrismaClient } from "@prisma/client";

/** Tope del campo `orden`: lo espejan los `min`/`max` de los formularios. */
export const ORDEN_MINIMO = 0;
export const ORDEN_MAXIMO = 9999;

/**
 * Lee un entero acotado al rango util. `null` si no es valido.
 *
 * El acotado NO es cosmetico: `orden` y `anio` son `Int` en la base (tope
 * 2.147.483.647). Sin techo, un numero enorme pasa la validacion y revienta
 * recien al escribir, con un 500 que nadie maneja.
 */
export function leerEnteroAcotado(valor: string, minimo: number, maximo: number): number | null {
  const numero = Number.parseInt(valor.trim(), 10);
  if (!Number.isSafeInteger(numero) || numero < minimo || numero > maximo) return null;
  return numero;
}

/** Orden de una lista administrable. Ausente o vacio equivale a 0. */
export function leerOrden(datos: FormData): number | null {
  const texto = String(datos.get("orden") ?? "").trim();
  return leerEnteroAcotado(texto === "" ? "0" : texto, ORDEN_MINIMO, ORDEN_MAXIMO);
}

export interface Ordenable {
  id: string;
  orden: number;
}

export type Direccion = "subir" | "bajar";

export interface NuevoOrden {
  id: string;
  orden: number;
}

/**
 * Mueve el elemento una posicion en la lista (que debe venir ya ordenada) y
 * devuelve el orden consecutivo resultante. Devuelve `null` si el elemento no
 * existe o si ya esta en el extremo: en ese caso no hay nada que escribir.
 */
export function calcularReordenamiento(
  lista: readonly Ordenable[],
  id: string,
  direccion: Direccion,
): NuevoOrden[] | null {
  const indice = lista.findIndex((elemento) => elemento.id === id);
  if (indice === -1) return null;

  const destino = direccion === "subir" ? indice - 1 : indice + 1;
  if (destino < 0 || destino >= lista.length) return null;

  const copia = [...lista];
  const movido = copia[indice];
  if (!movido) return null;
  copia.splice(indice, 1);
  copia.splice(destino, 0, movido);

  return copia.map((elemento, posicion) => ({ id: elemento.id, orden: posicion + 1 }));
}

type CriterioOrden = { orden: "asc" } | { creadoEn: "asc" };

// El desempate por `creadoEn` fija un orden unico para la lista: con dos filas
// empatadas en `orden` la base puede devolverlas en cualquier posicion relativa,
// y entonces el mismo boton moveria el elemento a un sitio distinto cada vez.
const ORDEN_LISTA: CriterioOrden[] = [{ orden: "asc" }, { creadoEn: "asc" }];

/**
 * Lo unico que el reordenamiento le pide a un modelo. Se declara a mano en vez
 * de usar los tipos generados porque cada modelo trae los suyos y aqui alcanza
 * con leer la lista y escribir el nuevo orden.
 *
 * El filtro va como PARAMETRO DE TIPO y no como `Record<string, string>`: con
 * ese tipo suelto, `{ paginald: id }` (una ele por una ene) compilaba sin una
 * queja y reventaba en produccion al pulsar «Subir». Dejandolo generico, cada
 * llamada lo infiere del delegado real que le pasa —`BloqueLineaWhereInput` y
 * companiaa— y el error vuelve al compilador, que es donde tiene que estar.
 */
export interface DelegadoOrdenable<F> {
  findMany(argumentos: {
    where: F;
    orderBy: CriterioOrden[];
    select: { id: true; orden: true };
  }): Promise<Ordenable[]>;
  update(argumentos: {
    where: { id: string };
    data: { orden: number };
  }): Prisma.PrismaPromise<unknown>;
}

export interface Movimiento<F> {
  /** Solo se usa para la transaccion; el modelo lo aporta `delegado`. */
  cliente: Pick<PrismaClient, "$transaction">;
  delegado: DelegadoOrdenable<F>;
  /** `{}` para las listas que abarcan el modelo entero. */
  filtro: F;
  id: string;
  direccion: Direccion;
}

/**
 * Mueve el elemento una posicion dentro de la lista que acota `filtro` y
 * renumera de una sola vez todas las filas afectadas. Devuelve `false` cuando no
 * hubo nada que mover: el elemento no esta en esa lista o ya esta en el extremo.
 */
export async function moverEnLista<F>({
  cliente,
  delegado,
  filtro,
  id,
  direccion,
}: Movimiento<F>): Promise<boolean> {
  const lista = await delegado.findMany({
    where: filtro,
    orderBy: ORDEN_LISTA,
    select: { id: true, orden: true },
  });
  const nuevos = calcularReordenamiento(lista, id, direccion);
  if (!nuevos) return false;

  // La renumeracion vale como una sola operacion: a medio aplicar dejaria la
  // lista con ordenes repetidos y el proximo movimiento saldria mal.
  await cliente.$transaction(
    nuevos.map((fila) => delegado.update({ where: { id: fila.id }, data: { orden: fila.orden } })),
  );
  return true;
}
