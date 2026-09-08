"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import { Label } from "@/components/tailgrids/core/label";

export function SignInForm() {
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
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" appearance="outline" className="w-full">Continue with Google</Button>
        <Button type="button" appearance="outline" className="w-full">Continue with Github</Button>
      </div>
      <div className="flex items-center gap-3 text-xs text-text-tertiary"><span className="h-px flex-1 bg-card-border" />OR<span className="h-px flex-1 bg-card-border" /></div>
      <div className="w-full space-y-1.5">
        <Label>Email Address *</Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full" />
      </div>
      <div className="w-full space-y-1.5">
        <Label>Password *</Label>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full" />
      </div>
      <div className="flex items-center justify-between text-xs">
        <label className="flex items-center gap-2 text-text-secondary"><input type="checkbox" className="rounded" />Keep me logged in</label>
        <a href="/auth/reset-password" className="font-medium text-brand-600 underline">Forget Password?</a>
      </div>
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-600">{error}</p>}
      <Button type="submit" appearance="fill" className="w-full" isDisabled={loading}>{loading ? "Entrando..." : "Login"}</Button>
      <p className="text-center text-xs text-text-tertiary">New here? <a href="/auth/sign-up" className="font-medium text-brand-600 underline">Create an account</a></p>
    </form>
  );
}
