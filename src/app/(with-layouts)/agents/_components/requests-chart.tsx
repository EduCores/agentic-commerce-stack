"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { ChartContainer } from "@/components/tailgrids/core/chart";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/tailgrids/core/badge";
import { InfoTip } from "@/components/tailgrids/core/info-tip";
import { Users, MessageSquare } from "lucide-react";
import { sharePct } from "@/utils/period-stats";

const COLORS = ["#5750F1", "#22C55E", "#F59E0B", "#06B6D4", "#8B5CF6", "#EF4444", "#10B981", "#3B82F6"];
const PAUSED = "#CBD5E1";

type AgentRow = { name: string; requests: number; active: boolean };

/** "StarShop Admin Ops" → "Admin Ops" (solo display, la BD queda intacta). */
function shortAgentName(name: string): string {
  return name.replace(/^starshop\s+/i, "").trim() || name;
}

/** Carga de trabajo por agente: gráfico limpio + ranking con nombres debajo. */
export function AgentsRequestsChart() {
  const { data } = useQuery<{ table: AgentRow[] }>({
    queryKey: ["agents-requests"],
    queryFn: async () => (await fetch("/api/ai/stats")).json(),
  });

  const agents = (data?.table ?? []).slice(0, 8);
  const total = agents.reduce((a, x) => a + x.requests, 0);
  const rows = agents.map((a, i) => ({
    idx: String(i + 1),
    solicitudes: a.requests,
    fill: a.active ? COLORS[i % COLORS.length] : PAUSED,
  }));
  const max = Math.max(...rows.map((r) => r.solicitudes), 1);

  if (agents.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-sm">Solicitudes por agente</CardTitle></CardHeader>
        <CardContent className="p-6 text-sm text-text-tertiary">Sin datos aún.</CardContent>
      </Card>
    );
  }

  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm">Solicitudes por agente — carga de trabajo</CardTitle>
            <InfoTip label="Detalle de carga">
              <div className="flex items-center gap-1.5">
                <MessageSquare className="size-3.5 text-text-tertiary" />
                <span>{total.toLocaleString("es-CL")} solicitudes</span>
                <span className="text-text-tertiary">entre</span>
                <Users className="size-3.5 text-text-tertiary" />
                <span>{agents.length} agentes</span>
              </div>
            </InfoTip>
          </div>
          <span className="flex items-center gap-3 text-xs text-text-tertiary">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[#5750F1]" aria-hidden="true" /> Activo
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: PAUSED }} aria-hidden="true" /> Pausado
            </span>
          </span>
        </div>
      </CardHeader>

      <CardContent className="h-64 p-0">
        <ChartContainer className="h-full w-full" height="100%" width="100%">
          <BarChart data={rows} margin={{ top: 16, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="idx"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11 }}
              interval={0}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11 }}
              allowDecimals={false}
              width={40}
              domain={[0, Math.ceil(max * 1.15)]}
            />
            <Bar dataKey="solicitudes" name="Solicitudes" radius={[6, 6, 0, 0]}>
              {rows.map((r) => (
                <Cell key={r.idx} fill={r.fill} />
              ))}
              <LabelList dataKey="solicitudes" position="top" style={{ fontSize: 11, fontWeight: 700 }} />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>

      <div className="border-t border-card-border px-0 py-3">
        <p className="text-xs text-text-tertiary">
          <InfoTip label="Ejes del gráfico">Eje X: n.º de agente · Eje Y: solicitudes</InfoTip>
        </p>
        <p className="mt-2 text-xs font-semibold text-text-secondary">Ranking — nombres y participación</p>
        <div className="mt-2 space-y-1.5">
          {agents.map((a, i) => (
            <div key={a.name} className="flex items-center gap-2 text-xs">
              <span
                className="flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{ backgroundColor: a.active ? COLORS[i % COLORS.length] : PAUSED }}
              >
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium text-text-primary" title={a.name}>
                {shortAgentName(a.name)}
              </span>
              <span className="shrink-0 font-bold text-text-primary">{a.requests.toLocaleString("es-CL")}</span>
              <Badge color={a.active ? "primary" : "gray"}>{sharePct(a.requests, total).toLocaleString("es-CL")}%</Badge>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
