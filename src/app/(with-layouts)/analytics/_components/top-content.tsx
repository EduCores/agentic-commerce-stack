import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { Badge } from "@/components/tailgrids/core/badge";
import type { AnalyticsData } from "./types";
import Link from "next/link";

export function AnalyticsTopContent({ data }: { data: AnalyticsData }) {
  return (
    <>
      <Card className="md:col-span-2">
        <CardHeader><CardTitle className="text-sm">Contenido top — productos más vistos</CardTitle></CardHeader>
        <CardContent>
          {data.topContent.length === 0 ? (
            <p className="text-sm text-text-tertiary">Sin movimientos aún. Vende desde /store o el chat.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-card-border text-xs text-text-tertiary">
                  <tr><th className="p-2 text-left">URL / Producto</th><th className="p-2 text-right">Visitas</th><th className="p-2 text-right">Únicos</th></tr>
                </thead>
                <tbody>
                  {data.topContent.map((t) => (
                    <tr key={t.sku} className="border-b border-card-border/60">
                      <td className="p-2">/producto/{t.sku} — {t.title}</td>
                      <td className="p-2 text-right">{t.views}</td>
                      <td className="p-2 text-right">{t.uniques}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">Stock bajo — reponer</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {data.lowStock.length === 0 ? <p className="text-sm text-text-tertiary">Sin datos</p> : data.lowStock.slice(0, 6).map((p) => (
            <div key={p.sku} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0">{p.title} <span className="text-xs text-text-tertiary">{p.sku}</span></span>
              <Badge color={p.stock < 10 ? "error" : "gray"}>{p.stock}</Badge>
            </div>
          ))}
          <Link href="/products" className="text-xs font-medium text-brand-600 underline">Ver /products</Link>
        </CardContent>
      </Card>
    </>
  );
}
