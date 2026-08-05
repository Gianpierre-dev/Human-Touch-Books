-- Migracion ADITIVA: la clasificacion escolar/literatura pasa a describir a la
-- LINEA, no al libro. Nada se destruye aqui; el enum `LineaLibro` y la columna
-- `libros.linea` siguen en pie hasta la migracion siguiente.

-- CreateEnum
CREATE TYPE "TipoLinea" AS ENUM ('escolar', 'literatura');

-- AlterTable
ALTER TABLE "lineas" ADD COLUMN     "tipo" "TipoLinea" NOT NULL DEFAULT 'escolar';

-- Reparto de datos: las lineas de Tutoria SMART (primaria y secundaria) son
-- escolares y ya quedaron asi por el DEFAULT. La unica de literatura es la
-- coleccion HTB Lector, identificada por su clave estable.
UPDATE "lineas" SET "tipo" = 'literatura' WHERE "clave" = 'lector';
