import type { APIRoute } from "astro";
import { Prisma } from "@prisma/client";
import { bd } from "../../../../lib/bd";
import { leerDatosLinea } from "../../../../lib/lineas";

export const prerender = false;

const DESTINO = "/admin/lineas";

export const POST: APIRoute = async ({ request, redirect }) => {
  const formulario = await request.formData();
  const { datos, error } = leerDatosLinea(formulario);
  if (!datos) return redirect(`${DESTINO}?error=${error}`, 303);

  // La unicidad la garantiza el indice de la base; comprobarla antes solo sirve
  // para dar un mensaje claro en el caso normal (dos altas simultaneas siguen
  // chocando contra el indice, y ahi vale el catch).
  const repetida = await bd.linea.findUnique({ where: { clave: datos.clave } });
  if (repetida) return redirect(`${DESTINO}?error=claverepetida`, 303);

  try {
    await bd.linea.create({ data: datos });
  } catch (fallo) {
    // Solo la violacion del indice unico se traduce a "clave repetida";
    // cualquier otro fallo debe salir a la luz y no disfrazarse de eso.
    if (fallo instanceof Prisma.PrismaClientKnownRequestError && fallo.code === "P2002") {
      return redirect(`${DESTINO}?error=claverepetida`, 303);
    }
    throw fallo;
  }
  return redirect(`${DESTINO}?ok=creada`, 303);
};
