/*
  Limitador de intentos en memoria del proceso.

  Un Map de marcas de tiempo por clave. Es suficiente para una sola instancia;
  si el despliegue escalara a varias replicas, cada una llevaria su propia
  cuenta (y habria que mover esto a la BD o a un almacen compartido).

  Dos cuidados que no son opcionales en un Map global de proceso:
  - Techo de claves: sin el, cualquiera que varie la clave (una IP distinta por
    peticion) lo hace crecer hasta tumbar el proceso.
  - Purga perezosa: solo se limpia la clave consultada. Barrer el Map entero en
    cada peticion es O(n) sobre miles de entradas para atender a una sola.
*/

const CLAVES_MAXIMAS = 10_000;

export interface LimitadorIntentos {
  /** Verdadero cuando la clave ya agoto sus intentos dentro de la ventana. */
  superaLimite(clave: string): boolean;
  /** Anota un intento fallido. Los intentos correctos no se anotan nunca. */
  registrarFallo(clave: string): void;
  /** Borra el historial de la clave (se llama tras un intento correcto). */
  reiniciar(clave: string): void;
}

export function crearLimitadorIntentos(
  intentosMaximos: number,
  ventanaMs: number,
): LimitadorIntentos {
  const fallosPorClave = new Map<string, number[]>();

  // Devuelve las marcas todavia vigentes de UNA clave y deja el Map al dia.
  function vigentes(clave: string): number[] {
    const ahora = Date.now();
    const marcas = (fallosPorClave.get(clave) ?? []).filter((marca) => ahora - marca < ventanaMs);
    if (marcas.length === 0) fallosPorClave.delete(clave);
    else fallosPorClave.set(clave, marcas);
    return marcas;
  }

  // Al desbordar se descarta la entrada mas antigua: un Map itera en orden de
  // insercion, asi que la primera clave es la que lleva mas tiempo dentro.
  function hacerSitio(clave: string): void {
    if (fallosPorClave.has(clave) || fallosPorClave.size < CLAVES_MAXIMAS) return;
    const masAntigua = fallosPorClave.keys().next().value;
    if (masAntigua !== undefined) fallosPorClave.delete(masAntigua);
  }

  return {
    superaLimite(clave) {
      return vigentes(clave).length >= intentosMaximos;
    },
    registrarFallo(clave) {
      const marcas = vigentes(clave);
      hacerSitio(clave);
      fallosPorClave.set(clave, [...marcas, Date.now()]);
    },
    reiniciar(clave) {
      fallosPorClave.delete(clave);
    },
  };
}

/*
  IP del cliente.

  El primer valor de X-Forwarded-For lo escribe QUIEN LLAMA, no el proxy: usarlo
  como identidad (que es justo lo que hace `clientAddress` de Astro) regala un
  bypass de cualquier limite con solo mandar una IP distinta en cada peticion.

  Detras de un proxy la cadena crece por la DERECHA: el ultimo salto es el que
  agrego nuestra infraestructura. Por eso se recorre de derecha a izquierda y se
  devuelve la primera IP publica: los saltos internos (privados o CGNAT, el
  100.64.0.0/10 que usa Railway) no identifican a nadie.
*/

// Rangos que nunca identifican a un cliente de internet.
const RANGOS_INTERNOS: RegExp[] = [
  /^10\./,
  /^127\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // CGNAT 100.64.0.0/10
  /^0\./,
  /^::1$/,
  /^::$/,
  /^f[cd]/i, // ULA IPv6 (fc00::/7)
  /^fe80:/i, // enlace local IPv6
];

function normalizar(valor: string): string {
  const limpio = valor.trim();
  // "[::1]:443" -> "::1"
  const conCorchetes = limpio.match(/^\[(.+)\](?::\d+)?$/);
  if (conCorchetes?.[1]) return conCorchetes[1];
  // "1.2.3.4:5678" -> "1.2.3.4" (un solo ":" es IPv4 con puerto, no IPv6)
  const partes = limpio.split(":");
  if (partes.length === 2 && partes[0]) return partes[0];
  return limpio;
}

function esInterna(ip: string): boolean {
  return RANGOS_INTERNOS.some((rango) => rango.test(ip));
}

export function ipDelCliente(request: Request, direccionCliente: string): string {
  // X-Real-IP la escribe el proxy con la IP real del cliente y no es una cadena.
  const real = request.headers.get("x-real-ip");
  if (real?.trim()) return normalizar(real);

  const cadena = request.headers.get("x-forwarded-for");
  if (!cadena) return direccionCliente;

  const saltos = cadena.split(",").map(normalizar).filter(Boolean);
  if (saltos.length === 0) return direccionCliente;

  for (let i = saltos.length - 1; i >= 0; i--) {
    const salto = saltos[i];
    if (salto && !esInterna(salto)) return salto;
  }

  // Todo interno (desarrollo o red privada): el ultimo salto es el mas fiable.
  return saltos[saltos.length - 1] ?? direccionCliente;
}
