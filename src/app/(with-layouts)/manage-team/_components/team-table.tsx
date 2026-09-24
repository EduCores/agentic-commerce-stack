"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/tailgrids/core/badge";
import { Button } from "@/components/tailgrids/core/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { ScrollHint } from "@/components/tailgrids/core/scroll-hint";
import { RoleSelect } from "./role-select";
import type { TeamMember } from "./types";
import { CalendarDays, Lock, Mail, MessageCircle, Phone, Plus, ShieldCheck, Trash2, User, UserPlus, Users } from "lucide-react";

export function TeamTable() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<{ members: TeamMember[] }>({
    queryKey: ["team"],
    queryFn: async () => (await fetch("/api/admin/team")).json(),
  });
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("member");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function add() {
    if (!email || !password) return;
    setMsg("");
    const r = await fetch("/api/admin/team", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, name, phone, role, password }) });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error ?? "Error"); return; }
    setEmail(""); setName(""); setPhone(""); setPassword(""); setMsg(`Miembro ${j.email} agregado${j.phone ? " → WhatsApp activo" : ""}`);
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

  async function changePhone(id: string, next: string) {
    const r = await fetch("/api/admin/team", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, phone: next }) });
    const j = await r.json();
    if (!r.ok) setMsg(j.error ?? "Error");
    else setMsg(next ? "Teléfono guardado → WhatsApp activo" : "Teléfono borrado → salió de WhatsApp");
    qc.invalidateQueries({ queryKey: ["team"] });
  }

  const members = data?.members ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-badge-sky-background text-badge-sky-text [&>svg]:size-4">
              <UserPlus />
            </span>
            <CardTitle className="text-sm">Agregar miembro</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-45 flex-1 flex-col gap-1 text-xs"><span className="flex items-center gap-1.5"><Mail className="size-3.5" />Correo</span><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="miembro@starshop.cl" className="w-full rounded-lg border border-card-border bg-input-background px-3 py-2 text-sm text-text-primary [color-scheme:light] dark:[color-scheme:dark]" /></label>
          <label className="flex min-w-45 flex-1 flex-col gap-1 text-xs"><span className="flex items-center gap-1.5"><User className="size-3.5" />Nombre</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" className="w-full rounded-lg border border-card-border bg-input-background px-3 py-2 text-sm text-text-primary [color-scheme:light] dark:[color-scheme:dark]" /></label>
          <label className="flex min-w-45 flex-1 flex-col gap-1 text-xs"><span className="flex items-center gap-1.5"><Phone className="size-3.5" />Teléfono WhatsApp</span><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="569XXXXXXXX" className="w-full rounded-lg border border-card-border bg-input-background px-3 py-2 text-sm text-text-primary [color-scheme:light] dark:[color-scheme:dark]" /></label>
          <div className="flex flex-col gap-1 text-xs"><span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5" />Rol</span>
            <RoleSelect value={role} onChange={setRole} label="Rol del miembro" />
          </div>
          <label className="flex min-w-45 flex-1 flex-col gap-1 text-xs"><span className="flex items-center gap-1.5"><Lock className="size-3.5" />Contraseña</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="mín. 8" className="w-full rounded-lg border border-card-border bg-input-background px-3 py-2 text-sm text-text-primary [color-scheme:light] dark:[color-scheme:dark]" /></label>
          <Button onClick={add} appearance="fill"><span className="flex items-center gap-1.5"><Plus className="size-4" />Agregar</span></Button>
          {msg && <Badge color="gray">{msg}</Badge>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-badge-violet-background text-badge-violet-text [&>svg]:size-4">
              <Users />
            </span>
            <CardTitle className="text-sm">Miembros ({members.length})</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-text-tertiary">Cargando...</p> : (
            <ScrollHint>
              <table className="w-full text-sm">
                <thead className="border-b border-card-border text-xs text-text-tertiary">
                  <tr><th className="p-2 text-left"><span className="inline-flex items-center gap-1.5"><User className="size-3.5" />Nombre</span></th><th className="p-2 text-left"><span className="inline-flex items-center gap-1.5"><Mail className="size-3.5" />Correo</span></th><th className="p-2 text-left"><span className="inline-flex items-center gap-1.5"><MessageCircle className="size-3.5" />WhatsApp</span></th><th className="p-2 text-left"><span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5" />Rol</span></th><th className="p-2 text-left"><span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" />Ingreso</span></th><th className="p-2 text-right">Acción</th></tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id} className="border-b border-card-border/60">
                      <td className="p-2">{m.name ?? "—"}</td>
                      <td className="p-2">{m.email}</td>
                      <td className="p-2">
                        <input defaultValue={m.phone ?? ""} key={`${m.id}-${m.phone ?? "none"}`} onBlur={(e) => { if (e.target.value !== (m.phone ?? "")) changePhone(m.id, e.target.value); }} placeholder="569XXXXXXXX" className="w-32 rounded-lg border border-card-border bg-input-background px-2 py-1 text-xs text-text-primary [color-scheme:light] dark:[color-scheme:dark]" />
                      </td>
                      <td className="p-2">
                        <RoleSelect value={m.role} onChange={(next) => changeRole(m.id, next)} label={`Rol de ${m.email}`} size="sm" />
                      </td>
                      <td className="p-2 text-xs text-text-tertiary">{new Date(m.createdAt).toLocaleDateString("es-CL")}</td>
                      <td className="p-2 text-right"><button onClick={() => remove(m.id)} className="inline-flex items-center gap-1 text-xs font-medium text-red-600 underline"><Trash2 className="size-3.5" />Eliminar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollHint>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
