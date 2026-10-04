-- Mini-Sentry propio: errores agrupados por fingerprint.
-- Nota: se aplica a mano porque `migrate dev` no puede reconstruir la shadow DB
-- (las migraciones 20260908_* corren antes que 20260922_baseline en orden
-- alfabético pero referencian tablas que crea el baseline). Ver INFORME en
-- sesión: la DB real está sana; solo el flujo shadow está roto.

-- CreateTable
CREATE TABLE "ErrorEvent" (
    "id" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "context" JSONB,
    "count" INTEGER NOT NULL DEFAULT 1,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "ErrorEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ErrorEvent_fingerprint_key" ON "ErrorEvent"("fingerprint");

-- CreateIndex
CREATE INDEX "ErrorEvent_resolved_lastSeenAt_idx" ON "ErrorEvent"("resolved", "lastSeenAt");

-- CreateIndex
CREATE INDEX "ErrorEvent_kind_idx" ON "ErrorEvent"("kind");
