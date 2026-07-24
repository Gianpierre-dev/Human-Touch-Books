-- CreateEnum
CREATE TYPE "LineaLibro" AS ENUM ('escolar', 'literatura');

-- CreateTable
CREATE TABLE "libros" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "subtitulo" TEXT,
    "linea" "LineaLibro" NOT NULL,
    "grado" TEXT,
    "nivel" TEXT,
    "autor" TEXT,
    "ilustrador" TEXT,
    "anio" INTEGER,
    "sinopsis" TEXT NOT NULL,
    "portada_url" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "destacado" BOOLEAN NOT NULL DEFAULT false,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "libros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "hash_contrasena" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ajustes" (
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "editado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ajustes_pkey" PRIMARY KEY ("clave")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_correo_key" ON "usuarios"("correo");
