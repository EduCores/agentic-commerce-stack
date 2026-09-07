"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import { Label } from "@/components/tailgrids/core/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@starshop.cl");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
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
    <div className="min-h-screen flex items-center justify-center bg-background-gray-secondary_alt_2 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 text-2xl font-black">STAR<span className="text-[#fdd817]">SHOP</span> ACS</div>
          <CardTitle>Admin — Dueño de tienda</CardTitle>
          <p className="text-sm text-text-tertiary">Único administrador del sistema. Visualiza productos, pedidos y agente.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@starshop.cl" required />
            </div>
            <div className="space-y-1.5">
              <Label>Contraseña</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
              <p className="text-xs text-text-tertiary">Por defecto: StarShop2026! (cambia vía ADMIN_PASSWORD en .env)</p>
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{error}</p>}
            <Button type="submit" appearance="fill" className="w-full" isDisabled={loading}>{loading ? "Entrando..." : "Entrar al Admin"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
