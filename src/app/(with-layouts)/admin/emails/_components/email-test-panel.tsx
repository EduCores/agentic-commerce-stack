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
      setResult(j.mocked ? `Mock OK → ${j.to} (${j.template})` : j.ok ? `Enviado → ${j.to}` : `Error: ${j.error ?? "desconocido"}`);
    } catch (e) {
      setResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Probar envío mock</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs">
          Para
          <input value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-card-border px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          Template
          <select value={template} onChange={(e) => setTemplate(e.target.value as typeof template)} className="rounded-lg border border-card-border px-3 py-2 text-sm">
            {KINDS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          OrderId
          <input value={orderId} onChange={(e) => setOrderId(e.target.value)} className="rounded-lg border border-card-border px-3 py-2 text-sm" />
        </label>
        <Button onClick={send} isDisabled={loading || !to} appearance="fill">
          {loading ? "..." : "Enviar mock"}
        </Button>
        {result && <Badge color="gray">{result}</Badge>}
      </CardContent>
    </Card>
  );
}
