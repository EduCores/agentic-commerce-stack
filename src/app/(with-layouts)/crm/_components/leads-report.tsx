import { Badge } from "@/components/tailgrids/core/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import type { CrmData } from "./types";

export function CrmLeadsReport({ data }: { data: CrmData }) {
  return (
    <Card className="md:col-span-2">
      <CardHeader><CardTitle className="text-sm">Reporte de leads — por cliente real</CardTitle></CardHeader>
      <CardContent>
        {data.leads.length === 0 ? (
          <p className="text-sm text-text-tertiary">Aún no hay clientes. Se crean con cada pedido.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-card-border text-xs text-text-tertiary">
                <tr><th className="p-2 text-left">Cliente</th><th className="p-2 text-right">Negocios</th><th className="p-2 text-right">Ingresos</th><th className="p-2 text-right">Nivel</th></tr>
              </thead>
              <tbody>
                {data.leads.slice(0, 10).map((l) => (
                  <tr key={l.id} className="border-b border-card-border/60">
                    <td className="p-2">{l.name}<p className="text-xs text-text-tertiary">{l.email}</p></td>
                    <td className="p-2 text-right">{l.deals}</td>
                    <td className="p-2 text-right">${l.revenue.toLocaleString("es-CL")}</td>
                    <td className="p-2 text-right"><Badge color={l.performance === "Alta" ? "success" : "gray"}>{l.performance}</Badge></td>
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
