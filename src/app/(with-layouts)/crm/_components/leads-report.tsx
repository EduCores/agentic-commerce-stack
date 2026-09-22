import { Badge } from "@/components/tailgrids/core/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import type { CrmData } from "./types";

import { Award, Users } from "lucide-react";

export function CrmLeadsReport({ data }: { data: CrmData }) {
  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-badge-violet-background text-badge-violet-text [&>svg]:size-4">
            <Users />
          </span>
          <CardTitle className="text-sm">Reporte de leads — por cliente real</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-1.5 rounded-full bg-gradient-to-r from-violet-400 to-indigo-500" />
        {data.leads.length === 0 ? (
          <p className="mt-3 text-sm text-text-tertiary">Aún no hay clientes. Se crean con cada pedido.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-card-border bg-background-gray-secondary/40 text-xs text-text-tertiary">
                <tr><th className="p-2 text-left">Cliente</th><th className="p-2 text-right">Negocios</th><th className="p-2 text-right">Ingresos</th><th className="p-2 text-right">Nivel</th></tr>
              </thead>
              <tbody>
                {data.leads.slice(0, 10).map((l, i) => (
                  <tr key={l.id} className="border-b border-card-border/60 transition hover:bg-background-gray-secondary/40">
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-xs font-bold text-white">
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-text-primary">{l.name}</p>
                          <p className="truncate text-xs text-text-tertiary">{l.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-2 text-right font-medium">{l.deals}</td>
                    <td className="p-2 text-right font-bold text-brand-600">${l.revenue.toLocaleString("es-CL")}</td>
                    <td className="p-2 text-right">
                      <Badge color={l.performance === "Alta" ? "success" : l.performance === "Media" ? "warning" : "gray"}>
                        {l.performance === "Alta" && <Award className="mr-1 size-3" />}
                        {l.performance}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
