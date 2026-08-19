import type { APIRoute } from "astro";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { bd } from "../../../../lib/bd";
import { esCorreoValido } from "../../../../lib/correo";
import { ErrorCuerpoExcedido, leerFormulario, TAMANO_FORMULARIO } from "../../../../lib/cuerpo";
import { guardarBorrador } from "../../../../lib/borrador";
import { LARGO_MAXIMO_CLAVE, LARGO_MINIMO_CLAVE } from "../../../../lib/sesion";

export const prerender = false;

// El mismo costo con el que se siembra la cuenta inicial (prisma/seed.mjs) y
// con el que se rehashea al cambiar la contrasena (api/admin/cuenta.ts).
const COSTO_BCRYPT = 12;

function destino(parametros: string): string {
  return `/admin/cuenta?${parametros}`;
}

// Devuelve el correo escrito para no obligar a reescribirlo tras un rechazo.
// La contrasena no viaja: el helper descarta los campos de clave.
const COOKIE_BORRADOR = "borrador_cuenta";
const RUTA_BORRADOR = "/admin/cuenta";

export const POST: APIRoute = async ({ request, redirect, locals, cookies }) => {
  // El middleware ya bloquea /api/admin sin sesion; esto solo cierra el tipo.
  if (!locals.sesion) return redirect("/admin/login", 303);

  let datos: FormData;
  try {
    datos = await leerFormulario(request, TAMANO_FORMULARIO);
  } catch (fallo) {
    if (fallo instanceof ErrorCuerpoExcedido) return redirect(destino("error=tamano"), 303);
    throw fallo;
  }
  // El correo se guarda en minusculas: es la clave con la que se entra al panel
  // y «Ana@htb.pe» y «ana@htb.pe» tienen que ser la misma cuenta.
  const correo = String(datos.get("correo") ?? "")
    .trim()
    .toLowerCase();
  const clave = String(datos.get("clave") ?? "");

  // Ante cualquier rechazo se devuelve el correo escrito: sin esto, un error de
  // formato obliga a reescribirlo entero. La clave se vuelve a pedir siempre.
  const recordarCorreo = () =>
    guardarBorrador({ cookies, nombre: COOKIE_BORRADOR, ruta: RUTA_BORRADOR }, datos);

  if (!correo || !clave) {
    recordarCorreo();
    return redirect(destino("error=cuentacampos"), 303);
  }

  // El type/maxlength del navegador se puede saltar: manda esta validacion.
  if (!esCorreoValido(correo)) {
    recordarCorreo();
    return redirect(destino("error=cuentacorreo"), 303);
  }
  if (clave.length < LARGO_MINIMO_CLAVE || clave.length > LARGO_MAXIMO_CLAVE) {
    recordarCorreo();
    return redirect(destino("error=cuentaclave"), 303);
  }

  try {
    await bd.usuario.create({
      data: {
        correo,
        // El alta no pide un nombre: en todo el panel la cuenta se identifica
        // por su correo. Se guarda la parte anterior a la arroba para no dejar
        // la columna vacia.
        nombre: correo.split("@")[0] ?? correo,
        hashContrasena: await bcrypt.hash(clave, COSTO_BCRYPT),
      },
    });
  } catch (fallo) {
    // Solo el choque contra el indice unico del correo se traduce a un mensaje;
    // el resto de los fallos no se disfrazan.
    if (fallo instanceof Prisma.PrismaClientKnownRequestError && fallo.code === "P2002") {
      recordarCorreo();
      return redirect(destino("error=cuentarepetida"), 303);
    }
    throw fallo;
  }

  return redirect(destino("ok=creada"), 303);
};
