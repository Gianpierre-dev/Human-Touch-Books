-- CreateTable
CREATE TABLE "paginas_institucionales" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "antetitulo" TEXT,
    "titulo_pagina" TEXT,
    "titulo_destacado" TEXT,
    "parrafos" TEXT,
    "imagen_url" TEXT,
    "imagen_alt" TEXT,
    "ancho" INTEGER,
    "alto" INTEGER,
    "bloques_antetitulo" TEXT,
    "bloques_titulo" TEXT,
    "cierre_texto" TEXT,
    "cierre_destacado" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT false,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paginas_institucionales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "secciones_pagina" (
    "id" TEXT NOT NULL,
    "pagina_id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "destacado" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "secciones_pagina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bloques_pagina" (
    "id" TEXT NOT NULL,
    "pagina_id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bloques_pagina_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "paginas_institucionales_clave_key" ON "paginas_institucionales"("clave");

-- CreateIndex
CREATE INDEX "secciones_pagina_pagina_id_idx" ON "secciones_pagina"("pagina_id");

-- CreateIndex
CREATE INDEX "bloques_pagina_pagina_id_idx" ON "bloques_pagina"("pagina_id");

-- AddForeignKey
ALTER TABLE "secciones_pagina" ADD CONSTRAINT "secciones_pagina_pagina_id_fkey" FOREIGN KEY ("pagina_id") REFERENCES "paginas_institucionales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloques_pagina" ADD CONSTRAINT "bloques_pagina_pagina_id_fkey" FOREIGN KEY ("pagina_id") REFERENCES "paginas_institucionales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

