"use client";

import { useState } from "react";
import { Button } from "@/components/tailgrids/core/button";
import { toast } from "sonner";

export interface HealthStatus {
  ok: boolean;
  total: number | null;
  latencyMs?: number;
}

interface Props {
  storeId?: string;
  storeName?: string;
  /** Último health-check persistido (para pintar el estado inicial). */
  initial?: (HealthStatus & { at?: string }) | null;
}

/**
 * Botón "Conectar tienda": verifica la conexión REAL contra la tienda
 * (catálogo vivo) y queda verde "Conectada" si responde, rojo si falla.
 * El estado se persiste en StoreConnection.config.lastHealthCheck.
 */
export function ConnectButton({ storeId, storeName = "tienda", initial }: Props) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<HealthStatus | null>(
    initial ? { ok: initial.ok, total: initial.total, latencyMs: initial.latencyMs } : null,
  );

  async function onConnect() {
    if (!storeId) return;
    setLoading(true);
    try {
      const r = await fetch("/api/store/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Error verificando conexión");
      setStatus({ ok: j.ok, total: j.total ?? null, latencyMs: j.latencyMs });
      if (j.ok) {
        toast.success(`Conectada a ${storeName} — ${j.total ?? "ok"} (${j.latencyMs}ms)`);
      } else {
        toast.error(`Sin conexión con ${storeName}: ${j.error ?? "desconocido"}`);
      }
    } catch (e) {
      toast.error(String(e));
      setStatus({ ok: false, total: null });
    } finally {
      setLoading(false);
    }
  }

  const connected = status?.ok === true;
  const failed = status?.ok === false;
  const label = loading
    ? "Verificando..."
    : connected
      ? `Conectada ✓ · ${status.total ?? "—"} productos`
      : failed
        ? "Sin conexión — reintentar"
        : "Conectar tienda";

  return (
    <Button
      appearance="fill"
      variant={loading || (!connected && !failed) ? "primary" : connected ? "success" : "danger"}
      onClick={onConnect}
      isDisabled={loading || !storeId}
      className="w-full shrink-0 whitespace-nowrap sm:w-auto"
    >
      {label}
    </Button>
  );
}
