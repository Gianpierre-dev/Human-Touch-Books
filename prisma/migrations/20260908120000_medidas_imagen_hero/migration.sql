-- Medidas reales de cada imagen del hero. Sin el ANCHO no se puede publicar un
-- `srcset` honesto: los descriptores «w» tienen que ser el ancho de verdad del
-- archivo, y sin ese dato la portada le sigue mandando la imagen completa (1736
-- px, 1,96 MB medidos) a un celular de 360 px.
-- Nullable a proposito: las filas anteriores a estas columnas no las tienen y
-- el hero sirve solo el original hasta que las complete
-- scripts/generar-variantes.mts.
-- AlterTable
ALTER TABLE "imagenes_hero" ADD COLUMN     "alto" INTEGER,
ADD COLUMN     "ancho" INTEGER;
