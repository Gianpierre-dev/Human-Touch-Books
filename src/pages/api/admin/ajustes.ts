import type { APIRoute } from "astro";
import { bd } from "../../../lib/bd";
import { LIMITES } from "../../../lib/contenido";

export const prerender = false;

// Datos de contacto: la web siempre necesita un valor y el panel los precarga,
// asi que un campo vacio se ignora en vez de borrar el dato.
const CLAVES_CONTACTO = ["correo_contacto", "whatsapp", "horario", "ubicacion"] as const;

// Textos de la pagina: aceptan quedar vacios. Sin fila, la landing recalcula su
// texto por defecto (el de Nosotros depende de la ubicacion), asi que vaciar el
// campo es justamente la forma de volver al original.
const CLAVES_TEXTO = ["hero_subtitulo", "nosotros_texto"] as const;

const LIMITE_POR_CLAVE: Record<(typeof CLAVES_TEXTO)[number], number> = {
  hero_subtitulo: LIMITES.subtituloHero,
  nosotros_texto: LIMITES.textoNosotros,
};

export const POST: APIRoute = async ({ request, redirect }) => {
  const formulario = await request.formData();

  for (const clave of CLAVES_TEXTO) {
    // Un campo ausente (otro formulario) no se toca; uno vacio si borra.
    if (!formulario.has(clave)) continue;
    const valor = String(formulario.get(clave) ?? "").trim();
    // El maxlength del navegador se puede saltar: el limite se valida aqui.
    if (valor.length > LIMITE_POR_CLAVE[clave]) {
      return redirect("/admin/ajustes?error=largo", 303);
    }
  }

  for (const clave of CLAVES_CONTACTO) {
    const valor = String(formulario.get(clave) ?? "").trim();
    if (valor === "") continue;
    await bd.ajuste.upsert({ where: { clave }, update: { valor }, create: { clave, valor } });
  }

  for (const clave of CLAVES_TEXTO) {
    if (!formulario.has(clave)) continue;
    const valor = String(formulario.get(clave) ?? "").trim();
    if (valor === "") {
      await bd.ajuste.deleteMany({ where: { clave } });
      continue;
    }
    await bd.ajuste.upsert({ where: { clave }, update: { valor }, create: { clave, valor } });
  }

  return redirect("/admin/ajustes?ok=guardado", 303);
};
