import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/emails/admin-guard";
import { prisma } from "@/lib/adapters/prisma";
import { fetchMetaCampaigns, getActiveMetaConnection, pauseMetaCampaign } from "@/lib/adapters/meta";
import { sendTransactionalEmail } from "@/lib/emails/send";

export const dynamic = "force-dynamic";

type Streaks = Record<string, { days: number; last: string; name: string }>;

/**
 * POST /api/meta/check — Piloto automático fase 1.
 * Revisa campañas con gasto y sin conversiones; al acumular `daysNoSales`
 * observaciones las pausa y avisa por email. Body: { minRoas?, daysNoSales?, notifyEmail? }
 */
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { minRoas, daysNoSales, notifyEmail } = (await req.json().catch(() => ({}))) as {
    minRoas?: number;
    daysNoSales?: number;
    notifyEmail?: string;
  };
  const needDays = Math.max(1, Math.min(30, Number(daysNoSales) || 3));
  const floor = Number(minRoas) || 1;

  const conn = await getActiveMetaConnection();
  if (!conn) return NextResponse.json({ error: "Sin conexión Meta activa" }, { status: 400 });

  let campaigns;
  try {
    campaigns = await fetchMetaCampaigns(conn.accessToken, conn.adAccountId);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }

  const cfg = (conn.config as Record<string, unknown> | null) ?? {};
  const auto = (cfg.autopilot as { streaks?: Streaks; paused?: string[] } | undefined) ?? {};
  const streaks: Streaks = { ...(auto.streaks ?? {}) };
  const pausedIds: string[] = [...(auto.paused ?? [])];
  const today = new Date().toISOString().slice(0, 10);

  const paused: { id: string; name: string; spend: number }[] = [];
  const watching: { id: string; name: string; spend: number; conversions: number; roas?: number; streak: number }[] = [];

  for (const c of campaigns) {
    if (c.status !== "ACTIVE") {
      delete streaks[c.id];
      continue;
    }
    if (pausedIds.includes(c.id)) continue;
    const loser = c.spend > 0 && c.conversions === 0;
    const prev = streaks[c.id];
    if (!loser) {
      if (prev) delete streaks[c.id];
      continue;
    }
    // Misma fecha no cuenta doble (re-clics idempotentes).
    const days = prev && prev.last === today ? prev.days : (prev?.days ?? 0) + 1;
    streaks[c.id] = { days, last: today, name: c.name };
    if (days >= needDays) {
      const r = await pauseMetaCampaign(conn.accessToken, c.id);
      if (r.ok) {
        pausedIds.push(c.id);
        delete streaks[c.id];
        paused.push({ id: c.id, name: c.name, spend: Math.round(c.spend) });
      } else {
        watching.push({ id: c.id, name: c.name, spend: Math.round(c.spend), conversions: c.conversions, roas: c.roas, streak: days });
      }
    } else {
      watching.push({ id: c.id, name: c.name, spend: Math.round(c.spend), conversions: c.conversions, roas: c.roas, streak: days });
    }
  }

  const result = { at: new Date().toISOString(), minRoas: floor, daysNoSales: needDays, paused, watching: watching.length };
  await prisma.metaConnection.update({
    where: { id: conn.id },
    data: { config: { ...cfg, autopilot: { minRoas: floor, daysNoSales: needDays, streaks, paused: pausedIds, lastCheckAt: result.at, lastResult: result } } },
  }).catch(() => {});

  let emailed: string | null = null;
  if (paused.length > 0) {
    const to = String(notifyEmail ?? "").trim() ||
      (await prisma.adminUser.findFirst({ where: { role: "owner" }, select: { email: true } }).catch(() => null))?.email;
    if (to) {
      const lines = paused.map((p) => `• ${p.name}: gastó $${p.spend.toLocaleString("es-CL")} sin ventas en ${needDays} revisiones`).join("\n");
      const sent = await sendTransactionalEmail({
        to,
        subject: `Piloto automático: pausé ${paused.length} campaña(s) sin ventas`,
        text: `Hola, soy el piloto automático de Meta.\n\nPausé estas campañas porque gastaron sin convertir (ROAS piso ${floor}):\n${lines}\n\nRevísalas en /marketing.`,
      }).catch(() => null);
      if (sent?.ok) emailed = to;
    }
  }

  return NextResponse.json({ ok: true, ...result, emailed });
}
