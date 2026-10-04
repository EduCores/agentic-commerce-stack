"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/tailgrids/core/badge";
import { Button } from "@/components/tailgrids/core/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { ScrollHint } from "@/components/tailgrids/core/scroll-hint";
import { toast } from "sonner";
import { TriangleAlert } from "lucide-react";

type ErrorRow = {
  fingerprint: string;
  kind: string;
  message: string;
  count: number;
  lastSeenAt: string;
  firstSeenAt: string;
  resolved: boolean;
};

export function ErrorsTable() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<{ errors: ErrorRow[] }>({
    queryKey: ["errors"],
    queryFn: async () => (await fetch("/api/errors")).json(),
  });
  const [resolving, setResolving] = useState<string | null>(null);

  async function resolve(fp: string) {
    setResolving(fp);
    try {
      const r = await fetch("/api/errors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fingerprint: fp }),
      });
      if (!r.ok) throw new Error();
      toast.success("Marcado como resuelto.");
      qc.invalidateQueries({ queryKey: ["errors"] });
    } catch {
      toast.error("No se pudo marcar.");
    } finally {
      setResolving(null);
    }
  }

  const rows = data?.errors ?? [];
  const open = rows.filter((r) => !r.resolved).length;

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-badge-error-background text-badge-error-text [&>svg]:size-4">
            <TriangleAlert size={16} />
          </span>
          <CardTitle>
            Errores agrupados ({open} abiertos)
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="min-w-0">
        {isLoading ? (
          <p className="text-sm text-text-tertiary">Cargando...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-text-tertiary">Sin errores registrados. El mini-Sentry agrupa aquí cada fallo.</p>
        ) : (
          <ScrollHint>
            <table className="w-max min-w-[720px] table-fixed text-sm">
              <colgroup>
                <col style={{ width: 90 }} />
                <col style={{ width: 320 }} />
                <col style={{ width: 90 }} />
                <col style={{ width: 130 }} />
                <col style={{ width: 130 }} />
              </colgroup>
              <thead className="border-b border-card-border bg-background-gray-secondary/50 text-xs text-text-tertiary">
                <tr>
                  <th className="p-2 text-left">Estado</th>
                  <th className="p-2 text-left">Error</th>
                  <th className="p-2 text-right">Veces</th>
                  <th className="p-2 text-left">Última vez</th>
                  <th className="p-2 text-center">Acción</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.fingerprint} className="border-b border-card-border/60">
                    <td className="p-2">
                      <Badge color={r.resolved ? "gray" : "error"}>{r.resolved ? "Resuelto" : "Abierto"}</Badge>
                    </td>
                    <td className="min-w-0 p-2">
                      <p className="truncate font-medium text-text-primary" title={`${r.kind}: ${r.message}`}>
                        [{r.kind}] {r.message}
                      </p>
                      <p className="truncate font-mono text-xs text-text-tertiary" title={r.fingerprint}>{r.fingerprint}</p>
                    </td>
                    <td className="p-2 text-right font-bold text-brand-600">{r.count.toLocaleString("es-CL")}</td>
                    <td className="whitespace-nowrap p-2 text-xs text-text-tertiary">
                      {new Date(r.lastSeenAt).toLocaleString("es-CL")}
                    </td>
                    <td className="p-2 text-center">
                      {!r.resolved && (
                        <Button
                          type="button"
                          variant="ghost"
                          appearance="ghost"
                          size="xs"
                          isDisabled={resolving === r.fingerprint}
                          onPress={() => resolve(r.fingerprint)}
                        >
                          {resolving === r.fingerprint ? "Guardando..." : "Resolver"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollHint>
        )}
      </CardContent>
    </Card>
  );
}
