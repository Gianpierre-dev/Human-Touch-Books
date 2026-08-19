import type { APIRoute } from "astro";
import { Prisma } from "@prisma/client";
import { bd } from "../../../../lib/bd";
import { leerDatosPagina } from "../../../../lib/paginas";
import {
  ErrorCuerpoExcedido,
  leerFormulario,
  respuestaCuerpoExcedido,
  TAMANO_FORMULARIO,
} from "../../../../lib/cuerpo";

export const prerender = false;

const DESTINO = "/admin/paginas";

// Alta de una pagina institucional. Nace DESACTIVADA (`activa` por defecto en
// false en el modelo): se crea vacia, se escribe el contenido y recien despues
// se publica. Asi un borrador nunca aparece solo en el menu.
export const POST: APIRoute = async ({ request, redirect }) => {
  let formulario: FormData;
  try {
    formulario = await leerFormulario(request, TAMANO_FORMULARIO);
  } catch (fallo) {
    if (fallo instanceof ErrorCuerpoExcedido) return respuestaCuerpoExcedido();
    throw fallo;
  }
  const { datos, error } = leerDatosPagina(formulario);
  if (!datos) return redirect(`${DESTINO}?error=${error}`, 303);

  // La unicidad la garantiza el indice de la base; comprobarla antes solo sirve
  // para dar un mensaje claro en el caso normal (dos altas simultaneas siguen
  // chocando contra el indice, y ahi vale el catch).
  const repetida = await bd.paginaInstitucional.findUnique({ where: { clave: datos.clave } });
  if (repetida) return redirect(`${DESTINO}?error=claverepetida`, 303);

  try {
    await bd.paginaInstitucional.create({ data: datos });
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
