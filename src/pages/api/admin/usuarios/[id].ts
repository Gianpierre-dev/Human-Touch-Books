import type { APIRoute } from "astro";
import { bd } from "../../../../lib/bd";

export const prerender = false;

function destino(parametros: string): string {
  return `/admin/cuenta?${parametros}`;
}

export const POST: APIRoute = async ({ params, request, redirect, locals }) => {
  const sesion = locals.sesion;
  // El middleware ya bloquea /api/admin sin sesion; esto solo cierra el tipo.
  if (!sesion) return redirect("/admin/login", 303);

  const id = params.id ?? "";
  const formulario = await request.formData();
  const accion = String(formulario.get("_accion") ?? "");
  if (accion !== "eliminar") return redirect(destino("error=cuentaaccion"), 303);

  // Nadie se borra a si mismo: el middleware invalida la sesion en la peticion
  // siguiente (el usuario del token ya no existe) y quien lo hizo se quedaria
  // fuera del panel sin entender por que. El boton ni siquiera se muestra en la
  // propia fila; esto cubre el envio hecho a mano.
  if (id === sesion.usuarioId) return redirect(destino("error=cuentapropia"), 303);

  // `deleteMany` no lanza si el id no existe: devuelve cero filas y eso ya es
  // la respuesta que hay que dar.
  const { count } = await bd.usuario.deleteMany({ where: { id } });
  if (count === 0) return redirect(destino("error=cuentanoexiste"), 303);

  return redirect(destino("ok=eliminada"), 303);
};
