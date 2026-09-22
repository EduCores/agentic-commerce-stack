"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
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
import { EMPTY_TEMPLATE_FORM, templateToForm, VARIABLE_HELP, type EmailTemplateDTO, type TemplateForm } from "./types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: EmailTemplateDTO | null; // null = nueva
  onSaved: () => void;
};

const inputCls =
  "w-full rounded-lg border border-card-border bg-input-background px-3 py-2 text-sm text-text-primary [color-scheme:light] dark:[color-scheme:dark]";

function insertAtCursor(
  el: HTMLInputElement | HTMLTextAreaElement | null,
  snippet: string,
  setter: (v: string) => void
) {
  if (!el) return;
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  const v = el.value;
  setter(v.slice(0, start) + snippet + v.slice(end));
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(start + snippet.length, start + snippet.length);
  });
}

export function TemplateEditorDialog({ open, onOpenChange, template, onSaved }: Props) {
  // El padre remonta con key={template?.id ?? "new"}: el estado inicial es el correcto sin effects.
  const [form, setForm] = useState<TemplateForm>(() => (template ? templateToForm(template) : EMPTY_TEMPLATE_FORM));
  const [preview, setPreview] = useState<{ sig: string; subject: string; html: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const formSig = JSON.stringify(form);

  // Vista previa en vivo (con debounce). Solo escribe estado desde el callback async.
  useEffect(() => {
    if (!open) return;
    if (!form.subject || !form.body) return;
    const snapshot = JSON.stringify(form);
    const t = setTimeout(async () => {
      try {
        const r = await fetch("/api/admin/emails/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fields: form }),
        });
        const j = await r.json();
        if (r.ok) setPreview({ sig: snapshot, html: j.html, subject: j.subject });
      } catch {
        // La vista previa nunca bloquea la edición.
      }
    }, 500);
    return () => clearTimeout(t);
  }, [open, form]);

  function set<K extends keyof TemplateForm>(key: K, value: TemplateForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    if (!form.name.trim() || !form.subject.trim() || !form.headerTitle.trim() || !form.body.trim()) {
      toast.error("Completa nombre, asunto, título y cuerpo.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        description: form.description || null,
        preheader: form.preheader || null,
        buttonText: form.buttonText || null,
        buttonUrl: form.buttonUrl || null,
      };
      const r = template
        ? await fetch(`/api/admin/emails/templates/${template.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/emails/templates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const j = await r.json();
      if (!r.ok) {
        toast.error(j.error ?? "No se pudo guardar");
        return;
      }
      toast.success(template ? "Plantilla actualizada" : "Plantilla creada");
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error de red");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog isOpen={open} onOpenChange={onOpenChange} className="max-w-5xl">
      <DialogHeader>
        <DialogTitle>{template ? `Editar: ${template.name}` : "Nueva plantilla"}</DialogTitle>
        <DialogDescription>
          Escribe con palabras simples y usa {"{{variables}}"} — se reemplazan solas al enviar.{" "}
          {template?.builtin && <Badge color="primary">Plantilla del sistema</Badge>}
        </DialogDescription>
      </DialogHeader>
      <DialogBody className="grid max-h-[70vh] gap-4 overflow-y-auto md:grid-cols-2">
        <div className="space-y-3">
          <label className="flex flex-col gap-1 text-xs">
            Nombre fácil
            <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ej: Carrito abandonado" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Descripción (para ti)
            <input value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Cuándo se usa esta plantilla" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Asunto del correo
            <input ref={subjectRef} value={form.subject} onChange={(e) => set("subject", e.target.value)} placeholder="Ej: Dejaste productos en tu carro" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Título del encabezado
            <input value={form.headerTitle} onChange={(e) => set("headerTitle", e.target.value)} placeholder="Ej: Carro guardado" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Cuerpo del mensaje
            <textarea ref={bodyRef} value={form.body} onChange={(e) => set("body", e.target.value)} rows={8} placeholder={"Hola {{nombre}},\n\n..."} className={`${inputCls} min-h-40`} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs">
              Texto del botón
              <input value={form.buttonText} onChange={(e) => set("buttonText", e.target.value)} placeholder="Ej: Retomar compra" className={inputCls} />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              Enlace del botón
              <input value={form.buttonUrl} onChange={(e) => set("buttonUrl", e.target.value)} placeholder="Ej: {{link}}" className={inputCls} />
            </label>
          </div>
          <div>
            <p className="mb-1 text-xs text-text-tertiary">Variables (clic para insertar):</p>
            <div className="flex flex-wrap gap-1.5">
              {VARIABLE_HELP.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  title={v.label}
                  onClick={() => insertAtCursor(bodyRef.current, `{{${v.key}}}`, (val) => set("body", val))}
                  className="rounded-md border border-card-border px-2 py-0.5 font-mono text-[11px] text-text-secondary hover:border-primary-500 hover:text-text-primary"
                >
                  {`{{${v.key}}}`}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => insertAtCursor(subjectRef.current, "{{pedido}}", (val) => set("subject", val))}
              className="mt-1.5 text-[11px] text-text-tertiary underline"
            >
              Insertar {"{{pedido}}"} en el asunto
            </button>
          </div>
          <Toggle label="Plantilla activa" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} />
        </div>
        <div className="min-w-0">
          <p className="mb-1 text-xs text-text-tertiary">Vista previa en vivo</p>
          <div className="overflow-hidden rounded-xl border border-card-border shadow-sm">
            <div className="flex items-center justify-between gap-2 border-b border-card-border bg-background-gray-secondary px-3 py-2">
              <p className="min-w-0 truncate text-xs font-semibold text-text-primary">
                {preview?.sig === formSig ? preview.subject : "—"}
              </p>
              <Badge color="primary">vista previa</Badge>
            </div>
            <div className="bg-background-gray-secondary/50 p-4">
              {preview?.sig === formSig ? (
                <div dangerouslySetInnerHTML={{ __html: preview.html }} />
              ) : (
                <p className="p-4 text-center text-xs text-text-tertiary">Escribe asunto y cuerpo para ver el correo aquí mismo.</p>
              )}
            </div>
          </div>
        </div>
      </DialogBody>
      <DialogFooter>
        <Button appearance="outline" onClick={() => onOpenChange(false)} isDisabled={saving}>
          Cancelar
        </Button>
        <Button appearance="fill" onClick={save} isDisabled={saving}>
          {saving ? "Guardando…" : template ? "Guardar cambios" : "Crear plantilla"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
