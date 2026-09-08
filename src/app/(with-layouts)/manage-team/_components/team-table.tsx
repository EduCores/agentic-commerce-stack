"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/tailgrids/core/badge";
import { Button } from "@/components/tailgrids/core/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import type { TeamMember } from "./types";

export function TeamTable() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<{ members: TeamMember[] }>({
    queryKey: ["team"],
    queryFn: async () => (await fetch("/api/admin/team")).json(),
  });
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("member");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function add() {
    if (!email || !password) return;
    setMsg("");
    const r = await fetch("/api/admin/team", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, name, role, password }) });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error ?? "Error"); return; }
    setEmail(""); setName(""); setPassword(""); setMsg(`Miembro ${j.email} agregado`);
    qc.invalidateQueries({ queryKey: ["team"] });
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar miembro?")) return;
    const r = await fetch(`/api/admin/team?id=${id}`, { method: "DELETE" });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error ?? "Error"); return; }
    qc.invalidateQueries({ queryKey: ["team"] });
  }

  async function changeRole(id: string, next: string) {
    await fetch("/api/admin/team", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, role: next }) });
    qc.invalidateQueries({ queryKey: ["team"] });
  }

  const members = data?.members ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-sm">Add Member</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-45 flex-1 flex-col gap-1 text-xs">Email<input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="miembro@starshop.cl" className="w-full rounded-lg border border-card-border px-3 py-2 text-sm" /></label>
          <label className="flex min-w-45 flex-1 flex-col gap-1 text-xs">Nombre<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" className="w-full rounded-lg border border-card-border px-3 py-2 text-sm" /></label>
          <label className="flex flex-col gap-1 text-xs">Rol
            <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-lg border border-card-border px-3 py-2 text-sm">
              <option value="member">member</option>
              <option value="admin">admin</option>
              <option value="owner">owner</option>
            </select>
          </label>
          <label className="flex min-w-45 flex-1 flex-col gap-1 text-xs">Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="mín. 8" className="w-full rounded-lg border border-card-border px-3 py-2 text-sm" /></label>
          <Button onClick={add} appearance="fill">Agregar</Button>
          {msg && <Badge color="gray">{msg}</Badge>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">Miembros ({members.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-text-tertiary">Cargando...</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-card-border text-xs text-text-tertiary">
                  <tr><th className="p-2 text-left">Name</th><th className="p-2 text-left">Email</th><th className="p-2 text-left">Role</th><th className="p-2 text-left">Joined</th><th className="p-2 text-right">Action</th></tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id} className="border-b border-card-border/60">
                      <td className="p-2">{m.name ?? "—"}</td>
                      <td className="p-2">{m.email}</td>
                      <td className="p-2">
                        <select value={m.role} onChange={(e) => changeRole(m.id, e.target.value)} className="rounded-lg border border-card-border px-2 py-1 text-xs">
                          <option value="member">member</option>
                          <option value="admin">admin</option>
                          <option value="owner">owner</option>
                        </select>
                      </td>
                      <td className="p-2 text-xs text-text-tertiary">{new Date(m.createdAt).toLocaleDateString("es-CL")}</td>
                      <td className="p-2 text-right"><button onClick={() => remove(m.id)} className="text-xs font-medium text-red-600 underline">Eliminar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
