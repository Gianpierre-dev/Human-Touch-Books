import type { APIRoute } from "astro";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { bd } from "../../../../lib/bd";
import { LARGO_MAXIMO_CLAVE, LARGO_MINIMO_CLAVE } from "../../../../lib/sesion";

export const prerender = false;

// El mismo costo con el que se siembra la cuenta inicial (prisma/seed.mjs) y
// con el que se rehashea al cambiar la contrasena (api/admin/cuenta.ts).
const COSTO_BCRYPT = 12;

const LARGO_MAXIMO_CORREO = 160;
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function destino(parametros: string): string {
  return `/admin/cuenta?${parametros}`;
}

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  // El middleware ya bloquea /api/admin sin sesion; esto solo cierra el tipo.
  if (!locals.sesion) return redirect("/admin/login", 303);

  const datos = await request.formData();
  // El correo se guarda en minusculas: es la clave con la que se entra al panel
  // y «Ana@htb.pe» y «ana@htb.pe» tienen que ser la misma cuenta.
  const correo = String(datos.get("correo") ?? "")
    .trim()
    .toLowerCase();
  const clave = String(datos.get("clave") ?? "");

  if (!correo || !clave) return redirect(destino("error=cuentacampos"), 303);

  // El type/maxlength del navegador se puede saltar: manda esta validacion.
  if (correo.length > LARGO_MAXIMO_CORREO || !CORREO.test(correo)) {
    return redirect(destino("error=cuentacorreo"), 303);
  }
  if (clave.length < LARGO_MINIMO_CLAVE || clave.length > LARGO_MAXIMO_CLAVE) {
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
      return redirect(destino("error=cuentarepetida"), 303);
    }
    throw fallo;
  }

  return redirect(destino("ok=creada"), 303);
};
