import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { Badge } from "@/components/tailgrids/core/badge";
import { sharePct } from "@/utils/period-stats";
import type { AnalyticsData } from "./types";
import Link from "next/link";
import { FolderX, PackageX } from "lucide-react";

export function AnalyticsTopContent({ data }: { data: AnalyticsData }) {
  const maxViews = Math.max(...data.topContent.map((t) => t.views), 1);
  const totalRevenue = data.topContent.reduce((a, t) => a + (t.revenue ?? 0), 0);
  const totalViews = data.topContent.reduce((a, t) => a + t.views, 0);
  const totalUnits = data.topContent.reduce((a, t) => a + t.uniques, 0);
  return (
    <>
      <Card className="min-w-0 md:col-span-2">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm">Contenido top — productos más vistos</CardTitle>
              <p className="mt-1 text-xs text-text-tertiary">
                {totalViews.toLocaleString("es-CL")} visitas · {totalUnits.toLocaleString("es-CL")} uds vendidas ·{" "}
                <span className="font-bold text-brand-600">${totalRevenue.toLocaleString("es-CL")}</span>
              </p>
            </div>
            <span className="rounded-full bg-background-gray-secondary px-2.5 py-1 text-xs font-bold text-text-primary">
              Top {data.topContent.length}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {data.topContent.length === 0 ? (
            <p className="text-sm text-text-tertiary">Sin movimientos aún. Vende desde /store o el chat.</p>
          ) : (
            <div className="space-y-2">
              {data.topContent.map((t, i) => (
                <div key={t.sku} className="rounded-lg border border-card-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-xs font-bold text-brand-600">{i + 1}</span>
                      <p className="min-w-0 truncate font-medium text-text-primary">
                        {t.title} <span className="text-xs text-text-tertiary">{t.sku}</span>
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <span className="text-xs font-bold text-brand-600">${t.revenue.toLocaleString("es-CL")}</span>
                      <Badge color={i === 0 ? "primary" : "gray"}>{sharePct(t.revenue ?? 0, totalRevenue).toLocaleString("es-CL")}%</Badge>
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background-gray-secondary">
                    <div className="h-full rounded-full" style={{ width: `${Math.round((t.views / maxViews) * 100)}%`, backgroundColor: ["#5750F1", "#22C55E", "#F59E0B", "#06B6D4", "#8B5CF6", "#EC4899"][i % 6] }} />
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-tertiary">
                    <span><strong className="text-text-primary">{t.views.toLocaleString("es-CL")}</strong> visitas</span>
                    <span><strong className="text-text-primary">{t.uniques.toLocaleString("es-CL")}</strong> uds vendidas</span>
                    <span>
                      Convierte <strong className="text-emerald-600">{t.views > 0 ? ((t.uniques / t.views) * 100).toFixed(1).replace(".", ",") : "0,0"}%</strong>
                    </span>
                    <Badge color="gray">@{t.sku}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle className="text-sm">Stock bajo — reponer</CardTitle>
          <p className="text-xs text-text-tertiary">Productos que necesitan reabastecimiento</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.lowStock.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-text-tertiary"><PackageX className="size-4" /> Sin datos</p>
          ) : (
            data.lowStock.slice(0, 6).map((p) => (
              <div key={p.sku} className="flex items-center justify-between gap-2 rounded-lg border border-card-border p-2.5 text-sm">
                <span className="min-w-0 truncate">{p.title} <span className="text-xs text-text-tertiary">{p.sku}</span></span>
                <Badge color={p.stock < 10 ? "error" : "gray"}>stock {p.stock}</Badge>
              </div>
            ))
          )}
          <Link href="/products" className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 underline">
            <FolderX className="size-3.5" /> Ver /products
          </Link>
        </CardContent>
      </Card>
    </>
  );
}
