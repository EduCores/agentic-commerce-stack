"use client";

import { useEffect, useState } from "react";
import { Toggle } from "@/components/tailgrids/core/toggle";
import { Bell, Mail, Megaphone, Package, ShieldCheck, Check } from "lucide-react";
import { toast } from "sonner";

type Prefs = {
  email: boolean;
  push: boolean;
  productUpdates: boolean;
  marketing: boolean;
  security: boolean;
};

const DEFAULTS: Prefs = { email: true, push: false, productUpdates: true, marketing: false, security: true };

const DEFS: { key: keyof Prefs; label: string; desc: string; icon: typeof Bell; color: string }[] = [
  { key: "email", label: "Notificación por correo", desc: "Pedidos, carros abandonados y avisos a tu email", icon: Mail, color: "bg-badge-sky-background text-badge-sky-text" },
  { key: "push", label: "Notificación push", desc: "Alertas instantáneas en este dispositivo", icon: Bell, color: "bg-badge-violet-background text-badge-violet-text" },
  { key: "productUpdates", label: "Actualización de productos", desc: "Stock bajo, precios y catálogo sincronizado", icon: Package, color: "bg-badge-warning-background text-badge-warning-text" },
  { key: "marketing", label: "Correo de marketing", desc: "Campañas, novedades y consejos de venta", icon: Megaphone, color: "bg-badge-pink-background text-badge-pink-text" },
  { key: "security", label: "Alerta de seguridad", desc: "Accesos nuevos y cambios en tu cuenta", icon: ShieldCheck, color: "bg-badge-success-background text-badge-success-text" },
];

const GROUPS: { title: string; desc: string; keys: (keyof Prefs)[] }[] = [
  { title: "Avisos de tu tienda", desc: "Lo operativo del día a día", keys: ["email", "push", "productUpdates"] },
  { title: "Marketing y seguridad", desc: "Promociones y protección de cuenta", keys: ["marketing", "security"] },
];

export default function NotificationPage() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [savingKey, setSavingKey] = useState<keyof Prefs | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/profile");
        if (!r.ok) return;
        const j = await r.json();
        setPrefs({ ...DEFAULTS, ...(j.notifications ?? {}) });
      } catch {
        // sin sesión: muestra defaults locales
        setPrefs(DEFAULTS);
      }
    })();
  }, []);

  async function onToggle(key: keyof Prefs, checked: boolean) {
    if (!prefs) return;
    const prev = prefs;
    setPrefs({ ...prefs, [key]: checked });
    setSavingKey(key);
    try {
      const r = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifications: { [key]: checked } }),
      });
      if (!r.ok) throw new Error("No se pudo guardar.");
      setSavedAt(new Date());
    } catch (err) {
      setPrefs(prev);
      toast.error(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl leading-7 font-semibold text-text-primary">Notificaciones</h2>
          <p className="mt-1 text-sm text-text-tertiary">Elige qué avisos recibes — se guardan en tu cuenta.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-text-tertiary" aria-live="polite">
          {savingKey ? (
            <>Guardando…</>
          ) : savedAt ? (
            <>
              <Check className="size-3.5 text-emerald-600" /> Guardado {savedAt.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
            </>
          ) : (
            <>{prefs ? "Listo" : "Cargando…"}</>
          )}
        </span>
      </div>

      <div className="mt-6 space-y-6">
        {GROUPS.map((g) => (
          <section key={g.title} className="min-w-0">
            <h3 className="text-sm font-semibold text-text-primary">{g.title}</h3>
            <p className="text-xs text-text-tertiary">{g.desc}</p>
            <div className="mt-2 divide-y divide-card-border rounded-xl border border-card-border bg-card-background px-4">
              {g.keys.map((k) => {
                const def = DEFS.find((d) => d.key === k)!;
                const Icon = def.icon;
                return (
                  <div key={k} className="flex min-w-0 items-center justify-between gap-4 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${def.color} [&>svg]:size-4`}>
                        <Icon />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-text-primary">{def.label}</p>
                        <p className="truncate text-xs text-text-tertiary">{def.desc}</p>
                      </div>
                    </div>
                    <Toggle
                      aria-label={def.label}
                      checked={prefs?.[k] ?? false}
                      disabled={!prefs || savingKey !== null}
                      onChange={(e) => onToggle(k, e.target.checked)}
                      size="md"
                      className="shrink-0"
                    />
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
