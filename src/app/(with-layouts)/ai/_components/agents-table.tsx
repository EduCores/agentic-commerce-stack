import { Badge } from "@/components/tailgrids/core/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { ScrollHint } from "@/components/tailgrids/core/scroll-hint";
import type { AiStats } from "./types";
import Link from "next/link";

export function AiAgentsTable({ data }: { data: AiStats }) {
  return (
      <Card className="min-w-0">
        <CardHeader><CardTitle className="text-sm">Agentes AI — equipos StarShop</CardTitle></CardHeader>
        <CardContent className="!px-3">
        {data.table.length === 0 ? (
          <p className="text-sm text-text-tertiary">Sin agentes. Ejecuta el seed.</p>
        ) : (
          <ScrollHint>
            <table className="w-full text-sm">
              <thead className="border-b border-card-border text-xs text-text-tertiary">
                <tr><th className="px-1.5 py-2 text-left">Nombre</th><th className="px-1.5 py-2 text-left">Estado</th><th className="px-1.5 py-2 text-right">Solicitudes</th><th className="px-1.5 py-2 text-right">Éxito</th></tr>
              </thead>
              <tbody>
                {data.table.slice(0, 9).map((a) => (
                  <tr key={a.id} className="border-b border-card-border/60">
                      <td className="min-w-0 px-1.5 py-2">{a.name}<p className="font-mono text-xs text-text-tertiary">{a.slug}</p></td>
                    <td className="px-1.5 py-2"><Badge color={a.active ? "success" : "gray"}>{a.active ? "Activo" : "Pausado"}</Badge></td>
                    <td className="px-1.5 py-2 text-right">{a.requests}</td>
                    <td className="px-1.5 py-2 text-right">{a.success}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollHint>
        )}
        <Link href="/agents" className="mt-2 inline-block text-xs font-medium text-brand-600 underline">Gestionar en /agents</Link>
      </CardContent>
    </Card>
  );
}
