-- AlterTable
ALTER TABLE "libros" ADD COLUMN     "descripcion_corta" TEXT,
ADD COLUMN     "linea_id" TEXT;

-- CreateTable
CREATE TABLE "lineas" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "etiqueta_corta" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "color_hex" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lineas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lineas_clave_key" ON "lineas"("clave");

-- CreateIndex
CREATE INDEX "libros_linea_id_idx" ON "libros"("linea_id");

-- AddForeignKey
ALTER TABLE "libros" ADD CONSTRAINT "libros_linea_id_fkey" FOREIGN KEY ("linea_id") REFERENCES "lineas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

