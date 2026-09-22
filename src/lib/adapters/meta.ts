/**
 * ACS Meta Adapter — plug & play SDK for Meta Marketing API
 * - Conexión vía Access Token + Ad Account ID (act_...)
 * - Datos reales: spend, impressions, clicks, ctr, conversions
 * - Sin credenciales → usa fallback mock para que marketing no se rompa
 */

import { prisma } from "@/lib/adapters/prisma";

export type MetaInsight = {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  cpc: number;
  roas?: number;
  raw?: Record<string, unknown>;
};

export type MetaConnectionSafe = {
  id: string;
  name: string;
  adAccountId: string;
  appId: string | null;
  pixelId: string | null;
  businessId: string | null;
  isActive: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastError: string | null;
  config: unknown;
  createdAt: string;
};

function maskToken(t: string): string {
  if (t.length <= 8) return "***";
  return t.slice(0, 6) + "..." + t.slice(-4);
}

function normalizeAdAccountId(raw: string): string {
  const v = raw.trim().replace(/^act_/, "");
  if (!/^\d+$/.test(v)) throw new Error("Ad Account ID inválido: debe ser numérico (ej: 123456789)");
  return v;
}

/** Obtiene la conexión activa principal (la primera). */
export async function getActiveMetaConnection() {
  return prisma.metaConnection.findFirst({ where: { isActive: true }, orderBy: { createdAt: "desc" } });
}

export async function listMetaConnectionsSafe(): Promise<MetaConnectionSafe[]> {
  const rows = await prisma.metaConnection.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    adAccountId: r.adAccountId,
    appId: r.appId,
    pixelId: r.pixelId,
    businessId: r.businessId,
    isActive: r.isActive,
    lastSyncAt: r.lastSyncAt?.toISOString() ?? null,
    lastSyncStatus: r.lastSyncStatus,
    lastError: r.lastError,
    config: r.config,
    createdAt: r.createdAt.toISOString(),
  }));
}

/** Test contra Graph API: valida token y cuenta. */
export async function testMetaConnection(accessToken: string, adAccountIdRaw: string): Promise<{ ok: boolean; accountName?: string; currency?: string; error?: string }> {
  const adAccountId = normalizeAdAccountId(adAccountIdRaw);
  const url = `https://graph.facebook.com/v20.0/act_${adAccountId}?fields=name,account_status,currency,balance&access_token=${encodeURIComponent(accessToken)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = json?.error?.message ?? `HTTP ${res.status}`;
      return { ok: false, error: msg };
    }
    return { ok: true, accountName: json.name, currency: json.currency };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Fetch insights reales desde Meta. */
export async function fetchMetaInsights(
  accessToken: string,
  adAccountIdRaw: string,
  opts: { datePreset?: string; timeRange?: { since: string; until: string } } = {}
): Promise<MetaInsight> {
  const adAccountId = normalizeAdAccountId(adAccountIdRaw);
  const datePreset = opts.datePreset ?? "last_30d";
  const fields = ["spend", "impressions", "clicks", "ctr", "cpc", "actions", "purchase_roas"].join(",");
  let url = `https://graph.facebook.com/v20.0/act_${adAccountId}/insights?fields=${fields}&date_preset=${datePreset}&access_token=${encodeURIComponent(accessToken)}`;
  if (opts.timeRange) {
    url = `https://graph.facebook.com/v20.0/act_${adAccountId}/insights?fields=${fields}&time_range[since]=${opts.timeRange.since}&time_range[until]=${opts.timeRange.until}&access_token=${encodeURIComponent(accessToken)}`;
  }

  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message ?? `Meta API error ${res.status}`;
    throw new Error(msg);
  }
  const row = json.data?.[0] ?? {};
  const actions: Array<{ action_type: string; value: string }> = row.actions ?? [];
  const purchase = actions.find((a) => a.action_type === "purchase" || a.action_type === "omni_purchase");
  const conversions = purchase ? Number(purchase.value) : 0;
  const roasEntry = row.purchase_roas?.[0];
  const roas = roasEntry ? Number(roasEntry.value) : undefined;

  return {
    spend: Number(row.spend ?? 0),
    impressions: Number(row.impressions ?? 0),
    clicks: Number(row.clicks ?? 0),
    ctr: Number(row.ctr ?? 0),
    cpc: Number(row.cpc ?? 0),
    conversions,
    roas,
    raw: row,
  };
}

/** Sincroniza la conexión activa y guarda cache en config. */
export async function syncMetaConnection(id: string): Promise<{ ok: boolean; insight?: MetaInsight; error?: string }> {
  const conn = await prisma.metaConnection.findUnique({ where: { id } });
  if (!conn) return { ok: false, error: "Conexión no encontrada" };
  try {
    const insight = await fetchMetaInsights(conn.accessToken, conn.adAccountId);
    await prisma.metaConnection.update({
      where: { id },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: "OK",
        lastError: null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        config: { ...(conn.config as Record<string, any> ?? {}), lastInsight: insight as unknown as any, lastAccountCheck: new Date().toISOString() },
      },
    });
    return { ok: true, insight };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await prisma.metaConnection.update({
      where: { id },
      data: { lastSyncAt: new Date(), lastSyncStatus: "ERROR", lastError: msg },
    }).catch(() => {});
    return { ok: false, error: msg };
  }
}

/** Devuelve datos para marketing: si hay conexión activa con insight cacheado, úsalo; si no, null. */
export async function getMetaMarketingData(): Promise<{ spend: number; impressions: number; clicks: number; conversions: number } | null> {
  const conn = await getActiveMetaConnection();
  if (!conn || !conn.isActive) return null;
  // Usa cache si es reciente (<1h) o intenta fetch live
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cfg = conn.config as Record<string, any> | null;
  const cached = cfg?.lastInsight as MetaInsight | undefined;
  if (cached && conn.lastSyncAt && Date.now() - conn.lastSyncAt.getTime() < 60 * 60 * 1000) {
    return { spend: cached.spend, impressions: cached.impressions, clicks: cached.clicks, conversions: cached.conversions };
  }
  try {
    const insight = await fetchMetaInsights(conn.accessToken, conn.adAccountId);
    // Guarda sin bloquear marketing
    prisma.metaConnection.update({
      where: { id: conn.id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { lastSyncAt: new Date(), lastSyncStatus: "OK", lastError: null, config: { ...(cfg ?? {}), lastInsight: insight as unknown as any } },
    }).catch(() => {});
    return { spend: insight.spend, impressions: insight.impressions, clicks: insight.clicks, conversions: insight.conversions };
  } catch {
    if (cached) return { spend: cached.spend, impressions: cached.impressions, clicks: cached.clicks, conversions: cached.conversions };
    return null;
  }
}

export { maskToken, normalizeAdAccountId };
