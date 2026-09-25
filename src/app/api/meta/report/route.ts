import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/emails/admin-guard";
import { prisma } from "@/lib/adapters/prisma";
import { fetchMetaCampaigns, getActiveMetaConnection } from "@/lib/adapters/meta";
import { sendTransactionalEmail } from "@/lib/emails/send";

export const dynamic = "force-dynamic";

/**
 * POST /api/meta/report — Reporte semanal ROAS por email.
 * Resumen de campañas (gasto/conversiones/ROAS últimos 7 días) + pausadas por el piloto.
 * Dispara así: botón en /marketing, o cron externo (curl con cookie admin, o vercel cron).
 */
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const conn = await getActiveMetaConnection();
  if (!conn) return NextResponse.json({ error: "Sin conexión Meta activa" }, { status: 400 });

  let campaigns;
  try {
    campaigns = await fetchMetaCampaigns(conn.accessToken, conn.adAccountId);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }

  const cfg = (conn.config as Record<string, unknown> | null) ?? {};
  const auto = (cfg.autopilot as { paused?: string[]; lastResult?: unknown } | undefined) ?? {};
  const pausedTotal = (auto.paused ?? []).length;

  const totalSpend = campaigns.reduce((acc, c) => acc + c.spend, 0);
  const totalConv = campaigns.reduce((acc, c) => acc + c.conversions, 0);
  const roasWeighted = totalSpend > 0 ? campaigns.reduce((acc, c) => acc + (c.roas ?? 0) * c.spend, 0) / totalSpend : 0;

  const lines = [...campaigns]
    .sort((a, b) => b.spend - a.spend)
    .map((c) => `• ${c.name} [${c.status}]: $${c.spend.toLocaleString("es-CL")} · ${c.conversions} ventas · ROAS ${(c.roas ?? 0).toFixed(1)}`)
    .join("\n");

  const to = (await prisma.adminUser.findFirst({ where: { role: "owner" }, select: { email: true } }))?.email;
  let sent = false;
  if (to) {
    const r = await sendTransactionalEmail({
      to,
      subject: `Reporte semanal StarShop Ads — ${new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short" }).format(new Date())}`,
      text: `Hola, tu reporte semanal de Meta Ads.\n\nGasto total: $${totalSpend.toLocaleString("es-CL")}\nConversiones: ${totalConv}\nROAS ponderado: ${roasWeighted.toFixed(2)}\nPausadas automáticamente a la fecha: ${pausedTotal}\n\nCampañas (últimos 7 días):\n${lines}\n\nRevísalas en /marketing.`,
      vars: { estado: "reporte", asunto: "Reporte semanal StarShop Ads" },
    }).catch(() => null);
    if (r?.ok) sent = true;
  }

  return NextResponse.json({
    ok: true,
    sent,
    to: to ?? null,
    summary: { campaigns: campaigns.length, totalSpend, totalConversions: totalConv, roas: Number(roasWeighted.toFixed(2)), pausedTotal },
  });
}