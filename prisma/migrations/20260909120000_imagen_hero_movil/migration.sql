-- Version para celular de cada imagen del hero (direccion de arte).
-- En pantallas angostas el hero es una caja alta: 345x700 px medidos a 360 px
-- de ventana (0,49:1). Una foto panoramica de 1,9:1 entra ahi por `object-cover`
-- y pierde el 74 % de su ancho, asi que el encuadre que se aprobo en escritorio
-- no es el que ve la mayoria del trafico. Estas columnas guardan una segunda
-- imagen, vertical, que la portada sirve con `<picture>` por debajo de 768 px.
-- Nullable a proposito: es opcional: sin ella el celular sigue mostrando la
-- panoramica recortada, exactamente como hasta ahora.
-- AlterTable
ALTER TABLE "imagenes_hero" ADD COLUMN     "imagen_movil_url" TEXT,
ADD COLUMN     "movil_alto" INTEGER,
ADD COLUMN     "movil_ancho" INTEGER;
