// SCRIPT HISTORICO — YA NO APLICA. No borra ni modifica nada: solo avisa.
//
// Su trabajo era doble y los dos ya se cumplieron:
//
//  1. Sembrar las tres lineas de producto. Eso ahora vive en prisma/seed.mjs,
//     que corre en cada despliegue y es idempotente.
//  2. Repartir los libros que existian entre esas lineas, usando como criterio
//     el enum `linea` del libro (escolar → Primaria, literatura → HTB Lector).
//     Ese enum ya no existe: la relacion con Linea es la unica fuente de verdad
//     (migracion 20260805130000_retirar_enum_linea_libro).
//
// Volver a ejecutarlo no tendria como decidir el destino de cada libro, asi que
// el cuerpo original se retiro en vez de dejar un script que reviente al correr.
console.log(
  [
    "scripts/sembrar-lineas.mjs ya no aplica.",
    "",
    "  · Las lineas de producto se siembran desde prisma/seed.mjs.",
    "  · El reparto inicial de libros por linea ya se hizo y el enum que lo",
    "    guiaba se retiro del modelo.",
    "",
    "No se ejecuto ninguna operacion contra la base de datos.",
  ].join("\n"),
);
