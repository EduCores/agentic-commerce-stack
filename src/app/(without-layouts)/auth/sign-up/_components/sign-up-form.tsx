"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import { Label } from "@/components/tailgrids/core/label";
import Link from "next/link";

export function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const r = await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Error");
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="w-full space-y-1.5">
        <Label>Nombre</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dueño StarShop" className="w-full" />
      </div>
      <div className="w-full space-y-1.5">
        <Label>Correo electrónico *</Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full" />
      </div>
      <div className="w-full space-y-1.5">
        <Label>Contraseña * (mín. 8)</Label>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full" />
      </div>
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-600">{error}</p>}
      <Button type="submit" appearance="fill" className="w-full" isDisabled={loading}>{loading ? "Creando..." : "Crear cuenta"}</Button>
      <p className="text-center text-xs text-text-tertiary">¿Ya tienes cuenta? <Link href="/auth/sign-in" className="font-medium text-brand-600 underline">Iniciar sesión</Link></p>
    </form>
  );
}
