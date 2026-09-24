"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/tailgrids/core/card";
import { Button } from "@/components/tailgrids/core/button";
import { Badge } from "@/components/tailgrids/core/badge";
import { ScrollHint } from "@/components/tailgrids/core/scroll-hint";
import type { LogDTO } from "./types";

type Props = {
  logs: LogDTO[];
  onReload: () => void;
};

const STATUS_META: Record<LogDTO["status"], { color: "success" | "gray" | "error"; label: string }> = {
  SENT: { color: "success", label: "Enviado" },
  MOCKED: { color: "gray", label: "Prueba" },
  FAILED: { color: "error", label: "Falló" },
};

export function LogSection({ logs, onReload }: Props) {
  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 text-sm text-text-tertiary">
          {logs.length} envíos recientes · incluye agente, secuencias y pruebas.
        </p>
        <Button appearance="outline" onClick={onReload}>
          Actualizar
        </Button>
      </div>
      {logs.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-text-tertiary">
            Aún no hay envíos. Envía una prueba o{" "}
            <Link href="/login" className="underline">inicia sesión</Link> para ver el historial.
          </CardContent>
        </Card>
      ) : (
        <ScrollHint>
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-card-border text-xs text-text-tertiary">
              <tr>
                <th className="p-2 text-left">Fecha</th>
                <th className="p-2 text-left">Para</th>
                <th className="p-2 text-left">Plantilla</th>
                <th className="p-2 text-left">Asunto</th>
                <th className="p-2 text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => {
                const meta = STATUS_META[l.status];
                return (
                  <tr key={l.id} className="border-b border-card-border/60">
                    <td className="p-2 text-xs text-text-tertiary">{new Date(l.createdAt).toLocaleString("es-CL")}</td>
                    <td className="p-2">{l.to}</td>
                    <td className="p-2 text-xs text-text-secondary" title={l.templateKey ?? ""}>
                      {l.template?.name ?? l.templateKey ?? "—"}
                    </td>
                    <td className="max-w-60 truncate p-2 text-xs text-text-secondary" title={l.error ?? l.subject}>
                      {l.subject}
                      {l.error && <span className="text-red-500"> · {l.error}</span>}
                    </td>
                    <td className="p-2">
                      <Badge color={meta.color}>{meta.label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollHint>
      )}
    </div>
  );
}
