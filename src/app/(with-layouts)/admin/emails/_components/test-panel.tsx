"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { Button } from "@/components/tailgrids/core/button";
import { Badge } from "@/components/tailgrids/core/badge";
import {
  Select,
  SelectContent,
  SelectIndicator,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/tailgrids/core/select";
import type { EmailTemplateDTO } from "./types";

type Props = {
  templates: EmailTemplateDTO[];
};

const inputCls =
  "w-full rounded-lg border border-card-border bg-input-background px-3 py-2 text-sm text-text-primary [color-scheme:light] dark:[color-scheme:dark]";

export function TestPanel({ templates }: Props) {
  const active = templates.filter((t) => t.isActive);
  const [to, setTo] = useState("dueno@starshop.cl");
  const [templateKey, setTemplateKey] = useState("order_confirmation");
  const [nombre, setNombre] = useState("Dueño StarShop");
  const [orderId, setOrderId] = useState("DEMO-1001");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  async function send() {
    if (!to || loading) return;
    setLoading(true);
    setResult("");
    try {
      const r = await fetch("/api/admin/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, templateKey, nombre, orderId }),
      });
      const j = await r.json();
      if (!r.ok) {
        const msg = `Error: ${j.error ?? "desconocido"}`;
        setResult(msg);
        toast.error(j.error ?? "No autorizado: inicia sesión en /login");
        return;
      }
      const msg = j.mocked ? `Prueba OK → ${j.to} (queda en historial)` : `Enviado → ${j.to}`;
      setResult(msg);
      toast.success(msg);
    } catch (e) {
      const msg = `Error: ${e instanceof Error ? e.message : String(e)}`;
      setResult(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="text-sm">Probar envío</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-45 flex-1 flex-col gap-1 text-xs">
          Para
          <input value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
        </label>
        <label className="flex min-w-45 flex-1 flex-col gap-1 text-xs">
          Nombre
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} />
        </label>
        <div className="flex flex-col gap-1 text-xs">
          <Select value={templateKey} onChange={(v) => setTemplateKey(String(v))} aria-label="Plantilla">
            <SelectLabel>Plantilla</SelectLabel>
            <SelectTrigger>
              <SelectValue />
              <SelectIndicator />
            </SelectTrigger>
            <SelectContent>
              {active.map((t) => (
                <SelectItem key={t.key} id={t.key} textValue={t.name}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <label className="flex min-w-45 flex-1 flex-col gap-1 text-xs">
          N° de pedido
          <input value={orderId} onChange={(e) => setOrderId(e.target.value)} className={inputCls} />
        </label>
        <Button onClick={send} isDisabled={loading || !to} appearance="fill">
          {loading ? "…" : "Enviar prueba"}
        </Button>
        {result && <Badge color="gray">{result}</Badge>}
      </CardContent>
    </Card>
  );
}
