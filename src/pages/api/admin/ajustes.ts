import type { APIRoute } from "astro";
import { bd } from "../../../lib/bd";

export const prerender = false;

const CLAVES_PERMITIDAS = ["correo_contacto", "whatsapp", "horario", "ubicacion"] as const;

export const POST: APIRoute = async ({ request, redirect }) => {
  const formulario = await request.formData();

  for (const clave of CLAVES_PERMITIDAS) {
    const valor = String(formulario.get(clave) ?? "").trim();
    if (valor === "") continue;
    await bd.ajuste.upsert({
      where: { clave },
      update: { valor },
      create: { clave, valor },
    });
  }

  return redirect("/admin/ajustes?ok=guardado", 303);
};
