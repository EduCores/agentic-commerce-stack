"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { ChartContainer } from "@/components/tailgrids/core/chart";
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import type { CrmData } from "./types";

export function CrmGrowthChart({ data }: { data: CrmData | null }) {
  const rows = data?.growth ?? [];
  return (
    <Card className="md:col-span-2">
      <CardHeader><CardTitle className="text-sm">Crecimiento de clientes potenciales y conversión</CardTitle></CardHeader>
      <CardContent className="h-64 p-0">
        <ChartContainer className="h-full w-full" height="100%" width="100%">
          <AreaChart data={rows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <defs>
              <linearGradient id="crm-growth-bg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22C55E" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Area type="monotone" dataKey="leads" name="Clientes potenciales" stroke="#22C55E" strokeWidth={2} fill="url(#crm-growth-bg)" dot={false} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
