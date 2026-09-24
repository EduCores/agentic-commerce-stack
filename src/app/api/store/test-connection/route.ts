import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/store/test-connection — Health-check real de la conexión de tienda.
 * Body: { storeId: string }
 * - starshop  → GET {STARSHOP_API_URL}/api/tenant/catalog?tenant=<storeId>
 * - mock      → siempre ok (no hay a dónde llamar)
 * - otros     → ping al dominio registrado (si existe)
 * Persiste el resultado en StoreConnection.config.lastHealthCheck para que
 * el estado "Conectada" sobreviva recargas del panel.
 */
export async function POST(req: Request) {
  const { storeId } = await req.json().catch(() => ({}));
  if (!storeId) return NextResponse.json({ error: "storeId requerido" }, { status: 400 });

  const store = await prisma.storeConnection.findUnique({ where: { id: storeId } });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  const start = Date.now();
  let ok = false;
  let total: number | null = null;
  let error: string | null = null;

  try {
    if (store.provider === "starshop") {
      const base = process.env.STARSHOP_API_URL ?? "http://localhost:3000";
      const url = `${base}/api/tenant/catalog?tenant=${encodeURIComponent(store.id)}`;
      // Reintentos con backoff: el DNS hacia Supabase puede flaquear un intento suelto.
      let lastErr: unknown = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8_000) });
          if (!res.ok) throw new Error(`StarShop respondió HTTP ${res.status}`);
          const json = (await res.json()) as { total?: number; products?: unknown[] };
          total = json.total ?? json.products?.length ?? 0;
          if (!total) throw new Error("Catálogo vacío (0 productos)");
          ok = true;
          lastErr = null;
          break;
        } catch (e) {
          lastErr = e;
          if (attempt < 3) await new Promise((r) => setTimeout(r, 1500 * attempt));
        }
      }
      if (!ok) throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
    } else if (store.provider === "mock") {
      ok = true;
      total = null;
    } else if (store.domain) {
      const res = await fetch(store.domain, { cache: "no-store", signal: AbortSignal.timeout(8_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      ok = true;
    } else {
      throw new Error(`Provider "${store.provider}" sin dominio para verificar`);
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const latencyMs = Date.now() - start;
  const health = { at: new Date().toISOString(), ok, total, latencyMs, error };

  const prevConfig = (store.config as Record<string, unknown> | null) ?? {};
  await prisma.storeConnection.update({
    where: { id: store.id },
    data: { config: { ...prevConfig, lastHealthCheck: health } },
  });

  return NextResponse.json({ ok, provider: store.provider, total, latencyMs, error, checkedAt: health.at });
}
