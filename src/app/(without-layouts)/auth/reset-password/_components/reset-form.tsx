"use client";

import { useState } from "react";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import { Label } from "@/components/tailgrids/core/label";
import Link from "next/link";

export function ResetForm() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function request() {
    setLoading(true); setMsg("");
    try {
      const r = await fetch("/api/auth/reset-request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const j = await r.json();
      setMsg(j.debugToken ? `Revisa tu correo. Token de prueba: ${j.debugToken.slice(0, 24)}… (pegado abajo)` : j.message ?? "Listo");
      if (j.debugToken) setToken(j.debugToken);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    } finally { setLoading(false); }
  }

  async function confirm() {
    setLoading(true); setMsg("");
    try {
      const r = await fetch("/api/auth/reset-confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Error");
      setMsg("Contraseña actualizada. Ve a Iniciar sesión.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <div className="w-full space-y-1.5">
        <Label>Correo *</Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@starshop.cl" className="w-full" />
        <Button onClick={request} appearance="outline" className="w-full" isDisabled={loading || !email}>Enviar instrucciones</Button>
      </div>
      <div className="w-full space-y-1.5">
        <Label>Token recibido</Label>
        <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Pega el token del correo" className="w-full" />
      </div>
      <div className="w-full space-y-1.5">
        <Label>Nueva contraseña (mín. 8)</Label>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full" />
        <Button onClick={confirm} appearance="fill" className="w-full" isDisabled={loading || !token || !password}>Actualizar contraseña</Button>
      </div>
      {msg && <p className="rounded-lg border border-card-border bg-background-gray-secondary_alt_2 break-all p-2 text-xs">{msg}</p>}
      <p className="text-center text-xs text-text-tertiary"><Link href="/auth/sign-in" className="font-medium text-brand-600 underline">Volver a Iniciar sesión</Link></p>
    </div>
  );
}
