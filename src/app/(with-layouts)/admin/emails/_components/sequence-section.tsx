"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { Button } from "@/components/tailgrids/core/button";
import { Badge } from "@/components/tailgrids/core/badge";
import { Toggle } from "@/components/tailgrids/core/toggle";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/tailgrids/core/dialog";
import {
  Select,
  SelectContent,
  SelectIndicator,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/tailgrids/core/select";
import { SequenceStepsEditor } from "./sequence-steps-editor";
import type { EmailSequenceDTO, EmailTemplateDTO, SequenceStepDTO } from "./types";

type Props = {
  sequences: EmailSequenceDTO[];
  templates: EmailTemplateDTO[];
  onReload: () => void;
};

const inputCls =
  "w-full rounded-lg border border-card-border bg-input-background px-3 py-2 text-sm text-text-primary [color-scheme:light] dark:[color-scheme:dark]";

const TRIGGER_LABEL: Record<string, string> = {
  ABANDONED_CART: "Carrito abandonado",
  MANUAL: "Manual",
};

export function SequenceSection({ sequences, templates, onReload }: Props) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<EmailSequenceDTO | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [trigger, setTrigger] = useState("ABANDONED_CART");
  const [steps, setSteps] = useState<SequenceStepDTO[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  function openNew() {
    setEditing(null);
    setName("");
    setDescription("");
    setTrigger("ABANDONED_CART");
    setSteps([{ waitHours: 1, templateKey: templates.find((t) => t.isActive)?.key ?? "abandoned_cart" }]);
    setIsActive(true);
    setEditorOpen(true);
  }

  function openEdit(s: EmailSequenceDTO) {
    setEditing(s);
    setName(s.name);
    setDescription(s.description ?? "");
    setTrigger(s.trigger);
    setSteps(s.steps);
    setIsActive(s.isActive);
    setEditorOpen(true);
  }

  async function save() {
    if (!name.trim()) {
      toast.error("Ponle un nombre a la secuencia.");
      return;
    }
    if (steps.length === 0) {
      toast.error("Agrega al menos 1 paso.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name,
        description: description || null,
        trigger,
        steps: steps.map((s) => ({ waitHours: s.waitHours, templateKey: s.templateKey, subject: s.subject || undefined })),
        isActive,
      };
      const r = editing
        ? await fetch(`/api/admin/emails/sequences/${editing.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/emails/sequences", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const j = await r.json();
      if (!r.ok) {
        toast.error(j.error ?? "No se pudo guardar");
        return;
      }
      toast.success(editing ? "Secuencia actualizada" : "Secuencia creada");
      setEditorOpen(false);
      onReload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error de red");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(s: EmailSequenceDTO) {
    try {
      const r = await fetch(`/api/admin/emails/sequences/${s.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !s.isActive }),
      });
      const j = await r.json();
      if (!r.ok) {
        toast.error(j.error ?? "No se pudo cambiar");
        return;
      }
      toast.success(s.isActive ? "Secuencia pausada" : "Secuencia activada");
      onReload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error de red");
    }
  }

  async function remove(s: EmailSequenceDTO) {
    if (!confirm(`¿Eliminar la secuencia "${s.name}" y sus inscripciones?`)) return;
    try {
      const r = await fetch(`/api/admin/emails/sequences/${s.id}`, { method: "DELETE" });
      if (!r.ok) {
        const j = await r.json();
        toast.error(j.error ?? "No se pudo eliminar");
        return;
      }
      toast.success("Secuencia eliminada");
      onReload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error de red");
    }
  }

  function templateName(key: string): string {
    return templates.find((t) => t.key === key)?.name ?? key;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-tertiary">
          Flujos automáticos: espera → correo → espera → correo. El cron los envía solos cada hora.
        </p>
        <Button appearance="fill" onClick={openNew}>
          Nueva secuencia
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {sequences.map((s) => (
          <Card key={s.id}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
                <span>{s.name}</span>
                <Badge color="primary">{TRIGGER_LABEL[s.trigger] ?? s.trigger}</Badge>
                <Badge color={s.isActive ? "success" : "gray"}>{s.isActive ? "activa" : "pausada"}</Badge>
              </CardTitle>
              {s.description && <p className="text-xs text-text-tertiary">{s.description}</p>}
            </CardHeader>
            <CardContent className="space-y-3">
              <ol className="space-y-1 text-xs text-text-secondary">
                {s.steps.map((st, i) => (
                  <li key={i}>
                    <Badge color="warning">+{st.waitHours}h</Badge> → {templateName(st.templateKey)}
                    {st.subject ? <span className="text-text-tertiary"> · “{st.subject}”</span> : ""}
                  </li>
                ))}
              </ol>
              <p className="text-xs text-text-tertiary">{s._count?.enrollments ?? 0} inscripciones totales</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button appearance="outline" onClick={() => openEdit(s)}>
                  Editar flujo
                </Button>
                <Button appearance="ghost" onClick={() => remove(s)}>
                  Eliminar
                </Button>
                <Toggle label="Activa" checked={s.isActive} onChange={() => toggleActive(s)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog isOpen={editorOpen} onOpenChange={setEditorOpen} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? `Editar: ${editing.name}` : "Nueva secuencia"}</DialogTitle>
          <DialogDescription>Arma el flujo por pasos. Cada paso espera unas horas y envía una plantilla.</DialogDescription>
        </DialogHeader>
        <DialogBody className="max-h-[70vh] space-y-3 overflow-y-auto">
          <label className="flex flex-col gap-1 text-xs">
            Nombre del flujo
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Recuperar carrito abandonado" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Descripción
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Para qué sirve este flujo" className={inputCls} />
          </label>
          <div className="flex flex-col gap-1 text-xs">
            <Select value={trigger} onChange={(v) => setTrigger(String(v))} aria-label="Disparador">
              <SelectLabel>Se dispara cuando</SelectLabel>
              <SelectTrigger>
                <SelectValue />
                <SelectIndicator />
              </SelectTrigger>
              <SelectContent>
                <SelectItem id="ABANDONED_CART" textValue="Carrito abandonado">Carrito abandonado</SelectItem>
                <SelectItem id="MANUAL" textValue="Manual">Manual (solo prueba)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <SequenceStepsEditor steps={steps} onChange={setSteps} templates={templates} />
          <Toggle label="Secuencia activa" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        </DialogBody>
        <DialogFooter>
          <Button appearance="outline" onClick={() => setEditorOpen(false)} isDisabled={saving}>
            Cancelar
          </Button>
          <Button appearance="fill" onClick={save} isDisabled={saving}>
            {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear secuencia"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
