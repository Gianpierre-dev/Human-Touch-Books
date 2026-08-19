-- Indice de la tabla que crece sola: una fila por consulta recibida, para
-- siempre. Cubre las dos unicas lecturas que existen: el contador de pendientes
-- de la barra lateral (que corre en CADA pagina del panel y hasta ahora era un
-- recorrido completo) y la lista, ordenada por sin atender primero y luego por
-- fecha descendente.
-- CreateIndex
CREATE INDEX "mensajes_atendido_creado_en_idx" ON "mensajes"("atendido", "creado_en" DESC);
