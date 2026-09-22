"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { Button } from "@/components/tailgrids/core/button";
import { Badge } from "@/components/tailgrids/core/badge";
import { Toggle } from "@/components/tailgrids/core/toggle";
import { TemplateEditorDialog } from "./template-editor-dialog";
import type { EmailTemplateDTO } from "./types";

type Props = {
  templates: EmailTemplateDTO[];
  onReload: () => void;
};

export function TemplateSection({ templates, onReload }: Props) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<EmailTemplateDTO | null>(null);

  function openNew() {
    setEditing(null);
    setEditorOpen(true);
  }

  function openEdit(t: EmailTemplateDTO) {
    setEditing(t);
    setEditorOpen(true);
  }

  async function toggleActive(t: EmailTemplateDTO) {
    try {
      const r = await fetch(`/api/admin/emails/templates/${t.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !t.isActive }),
      });
      const j = await r.json();
      if (!r.ok) {
        toast.error(j.error ?? "No se pudo cambiar");
        return;
      }
      toast.success(t.isActive ? "Plantilla desactivada" : "Plantilla activada");
      onReload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error de red");
    }
  }

  async function remove(t: EmailTemplateDTO) {
    if (!confirm(`¿Eliminar la plantilla "${t.name}"?`)) return;
    try {
      const r = await fetch(`/api/admin/emails/templates/${t.id}`, { method: "DELETE" });
      const j = await r.json();
      if (!r.ok) {
        toast.error(j.error ?? "No se pudo eliminar");
        return;
      }
      toast.success("Plantilla eliminada");
      onReload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error de red");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-tertiary">
          {templates.length} plantillas · las del sistema no se eliminan, se desactivan.
        </p>
        <Button appearance="fill" onClick={openNew}>
          Nueva plantilla
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {templates.map((t) => (
          <Card key={t.id}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
                <span>{t.name}</span>
                {t.builtin && <Badge color="primary">sistema</Badge>}
                <Badge color={t.isActive ? "success" : "gray"}>{t.isActive ? "activa" : "inactiva"}</Badge>
              </CardTitle>
              <p className="text-xs text-text-tertiary">
                <code>{t.key}</code>
                {t.description ? ` · ${t.description}` : ""}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="truncate text-xs text-text-secondary" title={t.subject}>
                Asunto: {t.subject}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button appearance="outline" onClick={() => openEdit(t)}>
                  Editar
                </Button>
                {!t.builtin && (
                  <Button appearance="ghost" onClick={() => remove(t)}>
                    Eliminar
                  </Button>
                )}
                <Toggle label="Activa" checked={t.isActive} onChange={() => toggleActive(t)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <TemplateEditorDialog key={editing?.id ?? "new"} open={editorOpen} onOpenChange={setEditorOpen} template={editing} onSaved={onReload} />
    </div>
  );
}
