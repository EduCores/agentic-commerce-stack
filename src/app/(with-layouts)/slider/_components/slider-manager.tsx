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

  async function fileToWebP(file: File): Promise<string> {
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
      reader.readAsDataURL(file);
    });
    // Si ya es WebP, no convertir
    if (file.type === "image/webp") return dataUrl;
    // Intenta convertir vía canvas
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error("No se pudo decodificar la imagen"));
        i.src = dataUrl;
      });
      const canvas = document.createElement("canvas");
      const maxW = 1920;
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > maxW) {
        h = Math.round((h * maxW) / w);
        w = maxW;
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return dataUrl;
      ctx.drawImage(img, 0, 0, w, h);
      const webp = canvas.toDataURL("image/webp", 0.85);
      // Algunos navegadores devuelven data:image/png si no soportan WebP
      if (webp.startsWith("data:image/webp")) return webp;
      return dataUrl;
    } catch {
      return dataUrl;
    }
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
    <div className="grid gap-4 lg:grid-cols-5 lg:items-start">
      <form onSubmit={onSubmit} className="flex w-full min-h-0 flex-col gap-4 self-start overflow-visible rounded-xl border border-card-border bg-card-background p-5 lg:col-span-2">
        <h3 className="font-semibold text-text-primary">{editingId == null ? "Nuevo slide" : `Editando #${editingId}`}</h3>
        <div className="grid w-full gap-4">
          <label className="grid gap-1.5">
            <span className="text-xs font-medium text-text-secondary">Título *</span>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Iluminación Industrial LED" className="w-full" />
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-medium text-text-secondary">Subtítulo</span>
            <Input value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} placeholder="Hasta 50% OFF + Envío Gratis RM" className="w-full" />
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-medium text-text-secondary">Descripción</span>
            <Input value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Proyectores, High Bay y alumbrado…" className="w-full" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-text-secondary">CTA</span>
              <Input value={form.cta} onChange={(e) => set("cta", e.target.value)} placeholder="Ver Ofertas" className="w-full" />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-text-secondary">Orden</span>
              <Input type="number" value={String(form.sortOrder)} onChange={(e) => set("sortOrder", Number(e.target.value))} className="w-full" />
            </label>
          </div>
          <label className="grid min-w-0 gap-1.5">
            <span className="text-xs font-medium text-text-secondary">Imagen *</span>
            <div className="flex min-w-0 gap-2">
              <Input value={form.image} onChange={(e) => set("image", e.target.value)} placeholder="/LED.png o https://…" className="flex-1 min-w-0 truncate" />
              <label className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg border border-card-border bg-card-background px-3 py-2 text-xs font-medium text-text-primary hover:bg-background-gray-secondary">
                Subir img
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    try {
                      const webp = await fileToWebP(f);
                      set("image", webp);
                      if (webp.startsWith("data:image/webp")) toast.success("Imagen convertida a WebP");
                    } catch (err) {
                      toast.error(String(err));
                    } finally {
                      e.target.value = "";
                    }
                  }}
                />
              </label>
            </div>
            {form.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.image} alt="Preview" className="mt-1 h-28 w-full rounded-lg border border-card-border object-cover" />
            ) : null}
            <span className="text-[11px] leading-4 text-text-tertiary">Pega una URL o ruta <code>/public</code> (ej: <code>/mi-banner.png</code>), o sube un archivo — se convierte a <b>WebP</b> y se guarda como data URL.</span>
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-medium text-text-secondary">Gradiente (clases Tailwind)</span>
            <Input value={form.bg} onChange={(e) => set("bg", e.target.value)} placeholder="from-amber-500 to-orange-600" className="w-full" />
          </label>
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} className="size-4 accent-current" />
            Activo (visible en el frontend)
          </label>
        </div>
        <div className="flex gap-2 pt-1">
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
          <p className="rounded-xl border border-card-border bg-card-background p-5 text-sm text-text-tertiary">
            Sin slides. Crea el primero con el formulario.
          </p>
        )}
        {slides.map((s) => (
          <div key={s.id} className="flex gap-3 rounded-xl border border-card-border bg-card-background p-3">
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
