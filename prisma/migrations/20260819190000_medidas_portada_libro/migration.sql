-- Medidas reales de la portada de cada libro. Sin ellas, la pagina no puede
-- reservar el hueco exacto de la imagen y su carga empuja el contenido hacia
-- abajo: en el Plan Lector el salto medido era de unos 150 px.
-- Nullable a proposito: las filas anteriores a esta columna no las tienen y la
-- pagina cae a un respaldo mientras no se completen.
-- AlterTable
ALTER TABLE "libros" ADD COLUMN     "alto" INTEGER,
ADD COLUMN     "ancho" INTEGER;
