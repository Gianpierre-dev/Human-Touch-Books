-- CreateTable
CREATE TABLE "imagenes_hero" (
    "id" TEXT NOT NULL,
    "imagen_url" TEXT NOT NULL,
    "alt_texto" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "imagenes_hero_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imagenes_sitio" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "imagen_url" TEXT NOT NULL,
    "alt_texto" TEXT NOT NULL,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imagenes_sitio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preguntas" (
    "id" TEXT NOT NULL,
    "pregunta" TEXT NOT NULL,
    "respuesta" TEXT NOT NULL,
    "enlace_href" TEXT,
    "enlace_texto" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "preguntas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "imagenes_sitio_clave_key" ON "imagenes_sitio"("clave");
