-- CreateEnum
CREATE TYPE "TipoBloqueLinea" AS ENUM ('pilar', 'argumento');

-- AlterTable
ALTER TABLE "lineas" ADD COLUMN     "argumentos_titulo" TEXT,
ADD COLUMN     "coleccion_titulo" TEXT,
ADD COLUMN     "cta_parrafo" TEXT,
ADD COLUMN     "cta_titulo" TEXT,
ADD COLUMN     "hero_alto" INTEGER,
ADD COLUMN     "hero_ancho" INTEGER,
ADD COLUMN     "hero_antetitulo" TEXT,
ADD COLUMN     "hero_imagen_alt" TEXT,
ADD COLUMN     "hero_imagen_url" TEXT,
ADD COLUMN     "hero_parrafo" TEXT,
ADD COLUMN     "hero_titulo" TEXT,
ADD COLUMN     "pilares_parrafo" TEXT,
ADD COLUMN     "pilares_titulo" TEXT;

-- CreateTable
CREATE TABLE "bloques_linea" (
    "id" TEXT NOT NULL,
    "linea_id" TEXT NOT NULL,
    "tipo" "TipoBloqueLinea" NOT NULL,
    "titulo" TEXT NOT NULL,
    "texto" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bloques_linea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bloques_linea_linea_id_tipo_idx" ON "bloques_linea"("linea_id", "tipo");

-- AddForeignKey
ALTER TABLE "bloques_linea" ADD CONSTRAINT "bloques_linea_linea_id_fkey" FOREIGN KEY ("linea_id") REFERENCES "lineas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

