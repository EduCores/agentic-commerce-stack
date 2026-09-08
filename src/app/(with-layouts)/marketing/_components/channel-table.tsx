import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { Badge } from "@/components/tailgrids/core/badge";
import type { MarketingData } from "./types";

export function MarketingChannelTable({ data }: { data: MarketingData }) {
  return (
    <Card className="md:col-span-3">
      <CardHeader><CardTitle className="text-sm">Channel Performance</CardTitle></CardHeader>
      <CardContent>
        {data.channels.length === 0 ? (
          <p className="text-sm text-text-tertiary">Sin canales aún. Los pedidos con <code>source</code> alimentan esta tabla.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-card-border text-xs text-text-tertiary">
                <tr><th className="p-2 text-left">Channel</th><th className="p-2 text-right">Spend</th><th className="p-2 text-right">Clicks</th><th className="p-2 text-right">Conv. %</th><th className="p-2 text-right">Revenue</th></tr>
              </thead>
              <tbody>
                {data.channels.map((c) => (
                  <tr key={c.channel} className="border-b border-card-border/60">
                    <td className="p-2"><Badge color="gray">{c.channel}</Badge></td>
                    <td className="p-2 text-right">${c.spend.toLocaleString("es-CL")}</td>
                    <td className="p-2 text-right">{c.clicks}</td>
                    <td className="p-2 text-right">{c.convRate}%</td>
                    <td className="p-2 text-right">${c.revenue.toLocaleString("es-CL")}</td>
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
