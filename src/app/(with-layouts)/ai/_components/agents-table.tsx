import { Badge } from "@/components/tailgrids/core/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import type { AiStats } from "./types";

export function AiAgentsTable({ data }: { data: AiStats }) {
  return (
    <Card className="md:col-span-2">
      <CardHeader><CardTitle className="text-sm">Agentes AI — equipos StarShop</CardTitle></CardHeader>
      <CardContent>
        {data.table.length === 0 ? (
          <p className="text-sm text-text-tertiary">Sin agentes. Ejecuta el seed.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-card-border text-xs text-text-tertiary">
                <tr><th className="p-2 text-left">Nombre</th><th className="p-2 text-left">Estado</th><th className="p-2 text-right">Solicitudes</th><th className="p-2 text-right">Éxito</th></tr>
              </thead>
              <tbody>
                {data.table.slice(0, 9).map((a) => (
                  <tr key={a.id} className="border-b border-card-border/60">
                    <td className="p-2">{a.name}<p className="font-mono text-xs text-text-tertiary">{a.slug}</p></td>
                    <td className="p-2"><Badge color={a.active ? "success" : "gray"}>{a.active ? "Activo" : "Pausado"}</Badge></td>
                    <td className="p-2 text-right">{a.requests}</td>
                    <td className="p-2 text-right">{a.success}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <a href="/agents" className="mt-2 inline-block text-xs font-medium text-brand-600 underline">Gestionar en /agents</a>
      </CardContent>
    </Card>
  );
}
