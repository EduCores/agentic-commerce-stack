"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/tailgrids/core/badge";
import { Button } from "@/components/tailgrids/core/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { Input } from "@/components/tailgrids/core/input";
import { Label } from "@/components/tailgrids/core/label";
import { TextField } from "@/components/tailgrids/core/text-field";
import { CreditCard, Check, Download } from "lucide-react";

const PLANS = [
  {
    id: "emprendedor",
    name: "Emprendedor",
    price: 9990,
    features: ["1 tienda", "100 productos", "Soporte por email"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 29990,
    features: ["5 tiendas", "Productos ilimitados", "Agente Star + flujos", "Soporte prioritario"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 79990,
    features: ["Tiendas ilimitadas", "Multi-usuario + roles", "SLA dedicado", "Onboarding asistido"],
  },
];

const HISTORY = [
  { id: "FAC-2026-09", date: "01-09-2026", amount: 29990, status: "Pagada" },
  { id: "FAC-2026-08", date: "01-08-2026", amount: 29990, status: "Pagada" },
  { id: "FAC-2026-07", date: "01-07-2026", amount: 29990, status: "Pagada" },
];

function validCard(num: string): boolean {
  const d = num.replace(/\D/g, "");
  if (d.length < 15 || d.length > 16) return false;
  let sum = 0;
  let dbl = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = Number(d[i]);
    if (dbl) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

function validExpiry(exp: string): boolean {
  const m = exp.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
  if (!m) return false;
  const mm = Number(m[1]);
  const yy = 2000 + Number(m[2]);
  const now = new Date();
  return yy > now.getFullYear() || (yy === now.getFullYear() && mm >= now.getMonth() + 1);
}

export default function BillingPage() {
  const [planId, setPlanId] = useState("pro");
  const [card, setCard] = useState({ last4: "4242", brand: "Visa", exp: "12/28" });
  const [form, setForm] = useState({ number: "", exp: "", cvc: "", name: "" });
  const [saving, setSaving] = useState(false);

  const plan = PLANS.find((p) => p.id === planId) ?? PLANS[1];

  function changePlan(id: string) {
    if (id === planId) return;
    setPlanId(id);
    toast.success(`Plan cambiado a ${PLANS.find((p) => p.id === id)?.name} — rige desde el próximo ciclo.`);
  }

  function saveCard(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Ingresa el nombre del titular.");
      return;
    }
    if (!validCard(form.number)) {
      toast.error("Número de tarjeta inválido.");
      return;
    }
    if (!validExpiry(form.exp)) {
      toast.error("Vencimiento inválido o pasado (MM/AA).");
      return;
    }
    if (!/^\d{3,4}$/.test(form.cvc.trim())) {
      toast.error("CVC inválido.");
      return;
    }
    setSaving(true);
    setTimeout(() => {
      const digits = form.number.replace(/\D/g, "");
      setCard({ last4: digits.slice(-4), brand: digits.startsWith("4") ? "Visa" : "Mastercard", exp: form.exp });
      setForm({ number: "", exp: "", cvc: "", name: "" });
      setSaving(false);
      toast.success("Método de pago actualizado.");
    }, 600);
  }

  return (
    <div className="space-y-6">
      {/* Plan actual */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-badge-success-background text-badge-success-text [&>svg]:size-4">
              <CreditCard />
            </span>
            <CardTitle className="text-sm">Plan actual</CardTitle>
            <Badge color="success">Activo</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-2xl font-extrabold tracking-tight text-text-primary">
                {plan.name} <span className="text-base font-medium text-text-tertiary">· ${plan.price.toLocaleString("es-CL")}/mes</span>
              </p>
              <p className="mt-1 text-xs text-text-tertiary">Próxima facturación: 01-10-2026 · Se renueva automáticamente</p>
            </div>
          </div>
          <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {plan.features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-text-secondary">
                <Check className="size-4 shrink-0 text-emerald-600" /> {f}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Cambiar plan */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Cambiar de plan</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {PLANS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => changePlan(p.id)}
                aria-pressed={planId === p.id}
                className={`rounded-xl border p-4 text-left transition ${
                  planId === p.id
                    ? "border-brand-500 bg-brand-500/5 shadow-sm"
                    : "border-card-border bg-card-background hover:border-brand-500/50"
                }`}
              >
                <p className="flex items-center justify-between text-sm font-bold text-text-primary">
                  {p.name}
                  {planId === p.id && <Badge color="success">Actual</Badge>}
                </p>
                <p className="mt-1 text-xl font-extrabold text-text-primary">${p.price.toLocaleString("es-CL")}<span className="text-xs font-medium text-text-tertiary">/mes</span></p>
                <ul className="mt-2 space-y-1">
                  {p.features.map((f) => (
                    <li key={f} className="text-xs text-text-tertiary">· {f}</li>
                  ))}
                </ul>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Método de pago */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Método de pago</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 rounded-lg border border-card-border p-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-badge-sky-background text-badge-sky-text [&>svg]:size-4">
              <CreditCard />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary">{card.brand} ···· {card.last4}</p>
              <p className="text-xs text-text-tertiary">Vence {card.exp}</p>
            </div>
            <Badge color="success" className="ml-auto">Verificada</Badge>
          </div>
          <form onSubmit={saveCard} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <TextField className="flex flex-col gap-1.5">
              <Label htmlFor="cc-name">Nombre del titular</Label>
              <Input id="cc-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Eduardo Navarro" />
            </TextField>
            <TextField className="flex flex-col gap-1.5">
              <Label htmlFor="cc-num">Número de tarjeta</Label>
              <Input id="cc-num" inputMode="numeric" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="4242 4242 4242 4242" />
            </TextField>
            <TextField className="flex flex-col gap-1.5">
              <Label htmlFor="cc-exp">Vencimiento (MM/AA)</Label>
              <Input id="cc-exp" inputMode="numeric" value={form.exp} onChange={(e) => setForm({ ...form, exp: e.target.value })} placeholder="12/28" />
            </TextField>
            <TextField className="flex flex-col gap-1.5">
              <Label htmlFor="cc-cvc">CVC</Label>
              <Input id="cc-cvc" inputMode="numeric" value={form.cvc} onChange={(e) => setForm({ ...form, cvc: e.target.value })} placeholder="123" />
            </TextField>
            <div className="md:col-span-2">
              <Button type="submit" isDisabled={saving}>{saving ? "Guardando..." : "Guardar tarjeta"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Historial */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Historial de facturas</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {HISTORY.map((h) => (
            <div key={h.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-card-border p-3 text-sm">
              <span className="font-mono text-xs font-bold text-text-primary">{h.id}</span>
              <span className="text-xs text-text-tertiary">{h.date}</span>
              <Badge color="success">{h.status}</Badge>
              <span className="ml-auto flex items-center gap-2 font-extrabold text-text-primary">
                ${h.amount.toLocaleString("es-CL")}
                <button
                  type="button"
                  onClick={() => toast.info(`Descargando ${h.id} (demo).`)}
                  className="flex items-center gap-1 text-xs font-medium text-brand-600 underline"
                >
                  <Download className="size-3.5" /> PDF
                </button>
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
