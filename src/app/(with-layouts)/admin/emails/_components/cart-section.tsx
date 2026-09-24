"use client";

import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { Button } from "@/components/tailgrids/core/button";
import { Badge } from "@/components/tailgrids/core/badge";
import type { CartDTO } from "./types";

type Props = {
  carts: CartDTO[];
  counts: Record<string, number>;
  onReload: () => void;
};

const STATUS_META: Record<string, { color: "warning" | "success" | "gray"; label: string }> = {
  OPEN: { color: "warning", label: "Por recuperar" },
  RECOVERED: { color: "success", label: "Recuperado" },
  EXPIRED: { color: "gray", label: "Expirado" },
};

export function CartSection({ carts, counts, onReload }: Props) {
  const [processing, setProcessing] = useState(false);

  async function processNow() {
    setProcessing(true);
    try {
      const r = await fetch("/api/admin/emails/run", { method: "POST" });
      const j = await r.json();
      if (!r.ok) {
        toast.error(j.error ?? "No autorizado: inicia sesión en /login");
        return;
      }
      const d = j.detection ?? {};
      const s = j.sending ?? {};
      toast.success(`Listo: ${d.detected ?? 0} detectados, ${s.sent ?? 0} correos enviados`);
      onReload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error de red");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="min-w-0 space-y-4">
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle className="text-sm">Recuperación automática</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Badge color="warning">Por recuperar: {counts.OPEN ?? 0}</Badge>
          <Badge color="success">Recuperados: {counts.RECOVERED ?? 0}</Badge>
          <Badge color="gray">Expirados: {counts.EXPIRED ?? 0}</Badge>
          <Button appearance="fill" onClick={processNow} isDisabled={processing}>
            {processing ? "Procesando…" : "Procesar ahora"}
          </Button>
          <p className="w-full text-xs text-text-tertiary">
            Detecta pedidos pendientes de más de 1 hora, los inscribe en las secuencias activas y envía los pasos
            vencidos. El cron lo repite solo cada hora. Las tiendas reportan carros a{" "}
            <code>POST /api/cart/abandoned</code>.
          </p>
        </CardContent>
      </Card>

      {carts.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-text-tertiary">
            Sin carros abandonados. Aparecen solos al detectar pedidos pendientes con email, o{" "}
            <Link href="/login" className="underline">inicia sesión</Link> para verlos.
          </CardContent>
        </Card>
      ) : (
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-card-border text-xs text-text-tertiary">
              <tr>
                <th className="p-2 text-left">Cliente</th>
                <th className="p-2 text-left">Productos</th>
                <th className="p-2 text-right">Total</th>
                <th className="p-2 text-left">Estado</th>
                <th className="p-2 text-left">Actividad</th>
              </tr>
            </thead>
            <tbody>
              {carts.map((c) => {
                const meta = STATUS_META[c.status] ?? STATUS_META.OPEN;
                return (
                  <tr key={c.id} className="border-b border-card-border/60">
                    <td className="p-2">
                      <p className="text-text-primary">{c.customerName ?? "—"}</p>
                      <p className="text-xs text-text-tertiary">{c.email}</p>
                    </td>
                    <td className="max-w-60 truncate p-2 text-xs text-text-secondary" title={c.items.map((i) => `${i.title} × ${i.qty}`).join(", ")}>
                      {c.items.length === 0 ? "—" : c.items.map((i) => `${i.title} × ${i.qty}`).join(", ")}
                    </td>
                    <td className="p-2 text-right">${Number(c.total).toLocaleString("es-CL")} {c.currency}</td>
                    <td className="p-2">
                      <Badge color={meta.color}>{meta.label}</Badge>
                    </td>
                    <td className="p-2 text-xs text-text-tertiary">
                      {new Date(c.lastActivityAt).toLocaleString("es-CL")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
