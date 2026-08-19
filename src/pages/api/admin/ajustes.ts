import type { APIRoute } from "astro";
import { bd } from "../../../lib/bd";
import { LIMITES } from "../../../lib/contenido";
import { esCorreoValido } from "../../../lib/correo";
import { ErrorCuerpoExcedido, leerFormulario, TAMANO_FORMULARIO } from "../../../lib/cuerpo";
import { esDireccionDeRed, LARGO_MAXIMO_RED, REDES } from "../../../lib/redes";

export const prerender = false;

const DESTINO = "/admin/ajustes";

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
  let formulario: FormData;
  try {
    formulario = await leerFormulario(request, TAMANO_FORMULARIO);
  } catch (fallo) {
    if (fallo instanceof ErrorCuerpoExcedido) return redirect(`${DESTINO}?error=tamano`, 303);
    throw fallo;
  }

  for (const clave of CLAVES_TEXTO) {
    // Un campo ausente (otro formulario) no se toca; uno vacio si borra.
    if (!formulario.has(clave)) continue;
    const valor = String(formulario.get(clave) ?? "").trim();
    // El maxlength del navegador se puede saltar: el limite se valida aqui.
    if (valor.length > LIMITE_POR_CLAVE[clave]) {
      return redirect(`${DESTINO}?error=largo`, 303);
    }
  }

  // El numero de WhatsApp se guarda solo con digitos y CON codigo de pais: la
  // web lo formatea asumiendo que los dos primeros digitos son el pais, y
  // wa.me no funciona sin el. Un 9 peruano suelto (9 digitos) se rechaza con
  // instruccion, no se adivina.
  if (formulario.has("whatsapp")) {
    const whatsapp = String(formulario.get("whatsapp") ?? "")
      .trim()
      .replace(/[\s()+-]/g, "");
    if (whatsapp !== "") {
      if (!/^\d{10,15}$/.test(whatsapp)) {
        return redirect(`${DESTINO}?error=whatsapp`, 303);
      }
      formulario.set("whatsapp", whatsapp);
    }
  }

  // Las redes se validan ANTES de escribir nada: media tanda guardada y media
  // rechazada dejaria el pie mostrando un estado que nadie pidio.
  for (const red of REDES) {
    if (!formulario.has(red.clave)) continue;
    const valor = String(formulario.get(red.clave) ?? "").trim();
    if (valor === "") continue;
    if (valor.length > LARGO_MAXIMO_RED) {
      return redirect(`${DESTINO}?error=redlargo`, 303);
    }
    if (!esDireccionDeRed(red, valor)) {
      return redirect(`${DESTINO}?error=red${red.campo}`, 303);
    }
  }

  // Mismo criterio que las redes, y por un motivo mas fuerte: el correo de
  // contacto no se muestra solo en el pie, alimenta el `mailto:` de todo el
  // sitio y el JSON-LD. Un «informes@» guardado deja rotos los dos.
  const correoContacto = String(formulario.get("correo_contacto") ?? "").trim();
  if (correoContacto !== "" && !esCorreoValido(correoContacto)) {
    return redirect(`${DESTINO}?error=correo`, 303);
  }

  const horario = String(formulario.get("horario") ?? "").trim();
  if (horario.length > LIMITES.horario) {
    return redirect(`${DESTINO}?error=horariolargo`, 303);
  }

  const ubicacion = String(formulario.get("ubicacion") ?? "").trim();
  if (ubicacion.length > LIMITES.ubicacion) {
    return redirect(`${DESTINO}?error=ubicacionlarga`, 303);
  }

  // Las escrituras se acumulan y van en UNA transaccion. En bucles sueltos, una
  // caida de conexion a mitad dejaba el pie con el WhatsApp nuevo y el horario
  // viejo — y el JSON-LD publicando esa mezcla— mientras quien administra veia
  // un error sin saber que se habia guardado. Es el mismo criterio que ya se
  // aplicaba a la validacion, ahora tambien a la escritura.
  const operaciones = [];

  for (const clave of CLAVES_CONTACTO) {
    const valor = String(formulario.get(clave) ?? "").trim();
    if (valor === "") continue;
    operaciones.push(
      bd.ajuste.upsert({ where: { clave }, update: { valor }, create: { clave, valor } }),
    );
  }

  // Los textos y las redes SI aceptan quedar vacios: sin fila, la web recalcula
  // su texto por defecto y el icono no se pinta.
  for (const clave of [...CLAVES_TEXTO, ...REDES.map((red) => red.clave)]) {
    if (!formulario.has(clave)) continue;
    const valor = String(formulario.get(clave) ?? "").trim();
    operaciones.push(
      valor === ""
        ? bd.ajuste.deleteMany({ where: { clave } })
        : bd.ajuste.upsert({ where: { clave }, update: { valor }, create: { clave, valor } }),
    );
  }

  if (operaciones.length > 0) await bd.$transaction(operaciones);

  return redirect(`${DESTINO}?ok=guardado`, 303);
};
