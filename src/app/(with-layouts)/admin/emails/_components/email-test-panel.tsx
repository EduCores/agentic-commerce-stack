"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { Button } from "@/components/tailgrids/core/button";
import { Badge } from "@/components/tailgrids/core/badge";

const KINDS = ["order_confirmation", "abandoned_cart", "return_update", "general"] as const;

export function EmailTestPanel() {
  const [to, setTo] = useState("dueno@starshop.cl");
  const [template, setTemplate] = useState<(typeof KINDS)[number]>("order_confirmation");
  const [orderId, setOrderId] = useState("DEMO-1001");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");

  async function send() {
    if (!to || loading) return;
    setLoading(true);
    setResult("");
    try {
      const r = await fetch("/api/admin/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, template, orderId }),
      });
      const j = await r.json();
      setResult(j.mocked ? `Prueba OK → ${j.to} (${j.template})` : j.ok ? `Enviado → ${j.to}` : `Error: ${j.error ?? "desconocido"}`);
    } catch (e) {
      setResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Probar envío de prueba</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-45 flex-1 flex-col gap-1 text-xs">
          Para
          <input value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded-lg border border-card-border bg-input-background px-3 py-2 text-sm text-text-primary [color-scheme:light] dark:[color-scheme:dark]" />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          Plantilla
          <select value={template} onChange={(e) => setTemplate(e.target.value as typeof template)} className="rounded-lg border border-card-border bg-input-background px-3 py-2 text-sm text-text-primary [color-scheme:light] dark:[color-scheme:dark]">
            {KINDS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </label>
        <label className="flex min-w-45 flex-1 flex-col gap-1 text-xs">
          ID del pedido
          <input value={orderId} onChange={(e) => setOrderId(e.target.value)} className="w-full rounded-lg border border-card-border bg-input-background px-3 py-2 text-sm text-text-primary [color-scheme:light] dark:[color-scheme:dark]" />
        </label>
        <Button onClick={send} isDisabled={loading || !to} appearance="fill">
          {loading ? "..." : "Enviar prueba"}
        </Button>
        {result && <Badge color="gray">{result}</Badge>}
      </CardContent>
    </Card>
  );
}
