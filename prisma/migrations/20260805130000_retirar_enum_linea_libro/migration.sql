-- Migracion DESTRUCTIVA: retira el enum `LineaLibro` y la columna
-- `libros.linea`. A partir de aqui la relacion con `lineas` es la unica fuente
-- de verdad de la clasificacion de un libro.
--
-- Va separada de la migracion aditiva a proposito: asi en el historial queda
-- claro que se destruyo y el SQL es trivial de auditar.

-- Salvaguarda: la columna que se va a borrar es lo unico que clasifica hoy a un
-- libro sin linea asignada. Si quedara alguno, al soltarla se volveria
-- inclasificable y desapareceria de la web sin dejar rastro de donde iba.
-- Antes que eso, la migracion aborta entera (la transaccion se revierte) y deja
-- la base exactamente como estaba.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "libros" WHERE "linea_id" IS NULL) THEN
    RAISE EXCEPTION
      'Hay libros sin linea asignada. Asignalos desde /admin antes de retirar el enum.';
  END IF;
END
$$;

-- AlterTable
ALTER TABLE "libros" DROP COLUMN "linea";

-- DropEnum
DROP TYPE "LineaLibro";
