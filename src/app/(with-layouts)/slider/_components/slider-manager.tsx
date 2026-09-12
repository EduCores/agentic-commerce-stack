"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import { Badge } from "@/components/tailgrids/core/badge";
import { toast } from "sonner";

export type Slide = {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  cta: string;
  image: string;
  bg: string;
  sortOrder: number;
  active: boolean;
};

const emptyForm = {
  title: "",
  subtitle: "",
  description: "",
  cta: "Ver más",
  image: "",
  bg: "from-slate-700 to-slate-900",
  sortOrder: 0,
  active: true,
};

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
  return json;
}

export function SliderManager({ initialSlides }: { initialSlides: Slide[] }) {
  const [slides, setSlides] = useState<Slide[]>(initialSlides);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const json = await api("/api/slider");
    setSlides(json.slides ?? []);
  }

  useEffect(() => {
    setSlides(initialSlides);
  }, [initialSlides]);

  function set<K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function startEdit(s: Slide) {
    setEditingId(s.id);
    setForm({
      title: s.title,
      subtitle: s.subtitle,
      description: s.description,
      cta: s.cta,
      image: s.image,
      bg: s.bg,
      sortOrder: s.sortOrder,
      active: s.active,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.image.trim()) {
      toast.error("Título e imagen son requeridos");
      return;
    }
    setSaving(true);
    try {
      if (editingId == null) {
        await api("/api/slider", { method: "POST", body: JSON.stringify(form) });
        toast.success("Slide creado");
      } else {
        await api(`/api/slider/${editingId}`, { method: "PUT", body: JSON.stringify(form) });
        toast.success("Slide actualizado");
      }
      cancelEdit();
      await refresh();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(s: Slide) {
    try {
      await api(`/api/slider/${s.id}`, { method: "PUT", body: JSON.stringify({ active: !s.active }) });
      toast.success(s.active ? "Slide desactivado" : "Slide activado");
      await refresh();
    } catch (err) {
      toast.error(String(err));
    }
  }

  async function onDelete(s: Slide) {
    if (!confirm(`¿Eliminar "${s.title}" del slider?`)) return;
    try {
      await api(`/api/slider/${s.id}`, { method: "DELETE" });
      toast.success("Slide eliminado");
      await refresh();
    } catch (err) {
      toast.error(String(err));
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <form onSubmit={onSubmit} className="space-y-3 rounded-xl border-[0.5px] border-card-border bg-card-background p-5 lg:col-span-2">
        <h3 className="font-semibold text-text-primary">{editingId == null ? "Nuevo slide" : `Editando #${editingId}`}</h3>
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-secondary">Título *</label>
          <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Iluminación Industrial LED" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-secondary">Subtítulo</label>
          <Input value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} placeholder="Hasta 50% OFF + Envío Gratis RM" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-secondary">Descripción</label>
          <Input value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Proyectores, High Bay y alumbrado…" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary">CTA</label>
            <Input value={form.cta} onChange={(e) => set("cta", e.target.value)} placeholder="Ver Ofertas" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary">Orden</label>
            <Input type="number" value={String(form.sortOrder)} onChange={(e) => set("sortOrder", Number(e.target.value))} />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-secondary">Imagen * (ruta /public o URL)</label>
          <Input value={form.image} onChange={(e) => set("image", e.target.value)} placeholder="/LED.png o https://…" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-secondary">Gradiente (clases Tailwind)</label>
          <Input value={form.bg} onChange={(e) => set("bg", e.target.value)} placeholder="from-amber-500 to-orange-600" />
        </div>
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} className="size-4 accent-current" />
          Activo (visible en el frontend)
        </label>
        <div className="rounded-xl border border-dashed border-card-border bg-background-gray-secondary p-3 text-xs text-text-secondary">
          💡 Para usar una imagen nueva: cópiala a <code>StarShop/public/</code> (ej: <code>/mi-banner.png</code>) y escribe esa ruta arriba. El frontend la sirve al instante.
        </div>
        <div className="flex gap-2">
          <Button type="submit" appearance="fill" isDisabled={saving} className="flex-1">
            {saving ? "Guardando…" : editingId == null ? "Crear slide" : "Guardar cambios"}
          </Button>
          {editingId != null && (
            <Button type="button" appearance="outline" onClick={cancelEdit}>Cancelar</Button>
          )}
        </div>
      </form>
      <div className="space-y-3 lg:col-span-3">
        {slides.length === 0 && (
          <p className="rounded-xl border-[0.5px] border-card-border bg-card-background p-5 text-sm text-text-tertiary">
            Sin slides. Crea el primero con el formulario.
          </p>
        )}
        {slides.map((s) => (
          <div key={s.id} className="flex gap-3 rounded-xl border-[0.5px] border-card-border bg-card-background p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.image} alt={s.title} className="h-20 w-32 shrink-0 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-text-primary">#{s.sortOrder} · {s.title}</p>
                <Badge color={s.active ? "success" : "gray"}>{s.active ? "Activo" : "Oculto"}</Badge>
              </div>
              <p className="truncate text-xs text-text-tertiary">{s.subtitle} · CTA: {s.cta}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" appearance="outline" onClick={() => startEdit(s)}>Editar</Button>
                <Button size="sm" appearance="outline" onClick={() => toggleActive(s)}>{s.active ? "Ocultar" : "Mostrar"}</Button>
                <Button size="sm" variant="danger" appearance="outline" onClick={() => onDelete(s)}>Eliminar</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
