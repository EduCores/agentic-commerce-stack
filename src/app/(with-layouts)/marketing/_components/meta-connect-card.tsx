"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { Badge } from "@/components/tailgrids/core/badge";
import { InfoTip } from "@/components/tailgrids/core/info-tip";
import { Button } from "@/components/tailgrids/core/button";
import { Facebook } from "@tailgrids/icons";
import { toast } from "sonner";

type Conn = {
  id: string;
  name: string;
  adAccountId: string;
  appId: string | null;
  pixelId: string | null;
  isActive: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastError: string | null;
  config: unknown;
};

const inputCls =
  "w-full rounded-lg border border-card-border bg-input-background px-3 py-2 text-sm text-text-primary [color-scheme:light] dark:[color-scheme:dark] placeholder:text-text-tertiary";

export function MetaConnectCard() {
  const [conns, setConns] = useState<Conn[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "StarShop Meta", adAccountId: "", accessToken: "", appId: "", pixelId: "" });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/meta");
      if (r.status === 401) {
        setConns([]);
        setLoading(false);
        return;
      }
      const j = await r.json();
      setConns(j.connections ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function test() {
    if (!form.accessToken || !form.adAccountId) {
      toast.error("Completa Ad Account ID y Access Token para probar");
      return;
    }
    setTesting(true);
    try {
      const r = await fetch("/api/meta/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: form.accessToken, adAccountId: form.adAccountId }),
      });
      const j = await r.json();
      if (!r.ok) {
        toast.error(j.error ?? "Falló validación");
        return;
      }
      toast.success(`Conectado ✓ — ${j.accountName ?? "Cuenta"} (${j.currency ?? ""})`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setTesting(false);
    }
  }

  async function connect() {
    if (!form.adAccountId || !form.accessToken) {
      toast.error("Ad Account ID y Access Token son requeridos");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await r.json();
      if (!r.ok) {
        toast.error(j.error ?? "No se pudo conectar");
        return;
      }
      toast.success("Meta conectado — datos reales activados en /marketing");
      setForm((f) => ({ ...f, accessToken: "" }));
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function sync(id?: string) {
    setSyncing(true);
    try {
      const r = await fetch("/api/meta/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(id ? { id } : {}),
      });
      const j = await r.json();
      if (!r.ok) {
        toast.error(j.error ?? "Sync falló");
        return;
      }
      toast.success(`Sincronizado: $${Number(j.insight.spend).toLocaleString("es-CL")} spend · ${j.insight.impressions.toLocaleString("es-CL")} imp.`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSyncing(false);
    }
  }

  async function del(id: string) {
    if (!confirm("¿Desconectar esta cuenta de Meta?")) return;
    try {
      const r = await fetch(`/api/meta/${id}`, { method: "DELETE" });
      if (!r.ok) {
        const j = await r.json();
        toast.error(j.error ?? "No se pudo desconectar");
        return;
      }
      toast.success("Desconectado");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  const active = conns.find((c) => c.isActive);

  return (
    <Card className="min-w-0 md:col-span-3">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="flex min-w-0 flex-1 items-center gap-2 text-sm">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#0866FF] text-white [&>svg]:size-4">
              <Facebook />
            </span>
            <span className="min-w-0 truncate">Meta Ads — plug & play SDK</span>
          </CardTitle>
          <InfoTip label="Cómo funciona Meta Ads">
            Conecta tu Ad Account y trae <strong>spend, impresiones, clics y conversiones reales</strong> al canal Meta de /marketing. Sin credenciales, el sistema usa mock y no se rompe.
          </InfoTip>
        </div>
        <div className="mt-2">
          {active ? <Badge color="success">Conectado · datos reales</Badge> : <Badge color="gray">Modo mock — conecta para datos reales</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Estado actual */}
        {loading ? (
          <p className="text-xs text-text-tertiary">Cargando conexiones...</p>
        ) : conns.length > 0 ? (
          <div className="space-y-2">
            {conns.map((c) => (
              <div key={c.id} className="rounded-lg border border-card-border p-3 text-sm">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-1.5 font-medium text-text-primary">
                    {c.name} <span className="font-mono text-xs text-text-tertiary">act_{c.adAccountId}</span>{" "}
                    <Badge color={c.isActive ? "success" : "gray"}>{c.isActive ? "Activa" : "Inactiva"}</Badge>
                  </p>
                  <p className="mt-1 text-xs text-text-tertiary">
                    {c.lastSyncAt ? `Último sync: ${new Date(c.lastSyncAt).toLocaleString("es-CL")} · ${c.lastSyncStatus ?? ""}` : "Sin sync aún"}
                    {c.lastError ? ` · Error: ${c.lastError.slice(0, 80)}` : ""}
                  </p>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Button size="sm" appearance="outline" onClick={() => sync(c.id)} isDisabled={syncing}>
                    {syncing ? "..." : "Sincronizar"}
                  </Button>
                  <Button size="sm" appearance="ghost" onClick={() => del(c.id)}>
                    Desconectar
                  </Button>
                </div>
              </div>
            ))}
            {!active && <p className="text-xs text-amber-600">Tienes conexiones pero ninguna activa — activa una.</p>}
          </div>
        ) : (
          <p className="text-xs text-text-tertiary">Sin conexiones Meta aún. Completa el formulario para conectar.</p>
        )}

        {/* Formulario plug & play */}
        <div className="rounded-xl border border-card-border bg-background-gray-secondary/30 p-4">
          <p className="flex items-center gap-2 text-xs font-semibold text-text-primary">
            Conectar Meta — SDK listo
            <InfoTip label="Detalle técnico del SDK">
              SDK: <code>src/lib/adapters/meta.ts</code> expone <code>getMetaMarketingData()</code> usado por /api/marketing. Endpoints: <code>GET /api/meta</code>, <code>POST /api/meta</code>, <code>POST /api/meta/test</code>, <code>POST /api/meta/sync</code>.
            </InfoTip>
          </p>
          <p className="text-xs text-text-tertiary">Sigue estos pasos para conectar:</p>
          <ol className="mt-1 list-decimal space-y-1 pl-4 text-xs text-text-tertiary">
            <li>
              Crea un token de usuario del sistema en{" "}
              <a href="https://business.facebook.com/settings/system-users" target="_blank" rel="noreferrer" className="underline">
                Business Settings → System Users
              </a>{" "}
              con permisos <code>ads_read</code>, <code>ads_management</code>.
            </li>
            <li>Copia Ad Account ID (solo dígitos, sin act_).</li>
            <li>Prueba y conecta.</li>
          </ol>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs">
              Nombre
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="StarShop Meta" className={inputCls} />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              Ad Account ID *
              <input value={form.adAccountId} onChange={(e) => setForm({ ...form, adAccountId: e.target.value })} placeholder="123456789012345" className={inputCls} />
            </label>
            <label className="flex flex-col gap-1 text-xs sm:col-span-2">
              Access Token * (se guarda cifrado en prod)
              <input
                value={form.accessToken}
                onChange={(e) => setForm({ ...form, accessToken: e.target.value })}
                placeholder="EAAx..."
                className={`${inputCls} font-mono text-xs`}
                type="password"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              App ID (opcional)
              <input value={form.appId} onChange={(e) => setForm({ ...form, appId: e.target.value })} placeholder="1234..." className={inputCls} />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              Pixel ID (opcional)
              <input value={form.pixelId} onChange={(e) => setForm({ ...form, pixelId: e.target.value })} placeholder="1234..." className={inputCls} />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button appearance="outline" onClick={test} isDisabled={testing || !form.accessToken || !form.adAccountId}>
              {testing ? "Probando..." : "Probar conexión"}
            </Button>
            <Button appearance="fill" onClick={connect} isDisabled={saving}>
              {saving ? "Conectando..." : "Conectar Meta"}
            </Button>
            {active && (
              <Button appearance="outline" onClick={() => sync()} isDisabled={syncing}>
                {syncing ? "Sincronizando..." : "Sincronizar ahora"}
              </Button>
            )}
            <span className="text-xs text-text-tertiary">Requiere login admin en /login</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
