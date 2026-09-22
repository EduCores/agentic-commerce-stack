"use client";

import { Button } from "@/components/tailgrids/core/button";
import { Badge } from "@/components/tailgrids/core/badge";
import {
  Select,
  SelectContent,
  SelectIndicator,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/tailgrids/core/select";
import type { EmailTemplateDTO, SequenceStepDTO } from "./types";

type Props = {
  steps: SequenceStepDTO[];
  onChange: (steps: SequenceStepDTO[]) => void;
  templates: EmailTemplateDTO[];
};

const inputCls =
  "w-full rounded-lg border border-card-border bg-input-background px-3 py-2 text-sm text-text-primary [color-scheme:light] dark:[color-scheme:dark]";

/** Cadena de nodos estilo flujo: disparador → (espera → correo) × N. */
export function SequenceStepsEditor({ steps, onChange, templates }: Props) {
  function set(i: number, patch: Partial<SequenceStepDTO>) {
    onChange(steps.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  }

  function remove(i: number) {
    onChange(steps.filter((_, j) => j !== i));
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= steps.length) return;
    const next = [...steps];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  function add() {
    const first = templates.find((t) => t.isActive);
    onChange([...steps, { waitHours: 24, templateKey: first?.key ?? "abandoned_cart" }]);
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 rounded-xl border border-card-border bg-card-background px-3 py-2">
        <Badge color="primary">Disparador</Badge>
        <span className="text-xs text-text-secondary">Carrito abandonado detectado</span>
      </div>
      {steps.map((s, i) => (
        <div key={i}>
          <div className="flex justify-center">
            <div className="flex flex-col items-center gap-1 py-1">
              <div className="h-4 w-px bg-card-border" />
              <Badge color="warning">espera {s.waitHours} h</Badge>
              <div className="h-1 w-px bg-card-border" />
            </div>
          </div>
          <div className="rounded-xl border border-card-border bg-card-background p-3">
            <div className="mb-2 flex items-center justify-between">
              <Badge color="success">Paso {i + 1} · Enviar correo</Badge>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="rounded-md px-2 py-1 text-xs text-text-tertiary hover:text-text-primary disabled:opacity-30"
                  aria-label="Subir paso"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === steps.length - 1}
                  className="rounded-md px-2 py-1 text-xs text-text-tertiary hover:text-text-primary disabled:opacity-30"
                  aria-label="Bajar paso"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="rounded-md px-2 py-1 text-xs text-red-500 hover:underline"
                >
                  Quitar
                </button>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex flex-col gap-1 text-xs">
                <Select value={String(s.waitHours)} onChange={(v) => set(i, { waitHours: Number(v) })} aria-label="Espera en horas">
                  <SelectLabel>Esperar</SelectLabel>
                  <SelectTrigger>
                    <SelectValue />
                    <SelectIndicator />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 3, 6, 12, 24, 48, 72].map((h) => (
                      <SelectItem key={h} id={String(h)} textValue={`${h} h`}>
                        {h} h
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1 text-xs">
                <Select value={s.templateKey} onChange={(v) => set(i, { templateKey: String(v) })} aria-label="Plantilla del paso">
                  <SelectLabel>Plantilla</SelectLabel>
                  <SelectTrigger>
                    <SelectValue />
                    <SelectIndicator />
                  </SelectTrigger>
                  <SelectContent>
                    {templates
                      .filter((t) => t.isActive)
                      .map((t) => (
                        <SelectItem key={t.key} id={t.key} textValue={t.name}>
                          {t.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <label className="mt-2 flex flex-col gap-1 text-xs">
              Asunto especial (opcional, si se deja vacío usa el de la plantilla)
              <input
                value={s.subject ?? ""}
                onChange={(e) => set(i, { subject: e.target.value })}
                placeholder="Ej: Último aviso: tu carro sigue guardado"
                className={inputCls}
              />
            </label>
          </div>
        </div>
      ))}
      <div className="flex justify-center pt-2">
        <Button appearance="outline" onClick={add}>
          + Agregar paso
        </Button>
      </div>
    </div>
  );
}
