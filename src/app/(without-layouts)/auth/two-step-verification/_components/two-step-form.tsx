"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import { Label } from "@/components/tailgrids/core/label";
import OtpInput from "@/components/tailgrids/core/otp-input";

export function TwoStepForm() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@starshop.cl");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function request() {
    setLoading(true); setMsg("");
    try {
      const r = await fetch("/api/auth/2fa/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Error");
      setMsg(j.debugCode ? `Código demo: ${j.debugCode}` : j.message ?? "Código enviado");
      if (j.debugCode) setCode(j.debugCode);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    } finally { setLoading(false); }
  }

  async function verify() {
    setLoading(true); setMsg("");
    try {
      const r = await fetch("/api/auth/2fa/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Error");
      router.push("/");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Email *</Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button onClick={request} appearance="outline" className="w-full" isDisabled={loading || !email}>Enviar código</Button>
      </div>
      <div className="space-y-1.5">
        <Label>Código de 6 dígitos</Label>
        <OtpInput value={code} onChange={(e) => setCode(e.target.value)} digitLength={6} />
      </div>
      <Button onClick={verify} appearance="fill" className="w-full" isDisabled={loading || code.length !== 6}>Verificar y entrar</Button>
      {msg && <p className="rounded-lg border border-card-border bg-background-gray-secondary_alt_2 p-2 text-xs">{msg}</p>}
    </div>
  );
}
