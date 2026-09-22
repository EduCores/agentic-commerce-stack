import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/prisma";
import { requireAdmin } from "@/lib/emails/admin-guard";
import { listMetaConnectionsSafe, normalizeAdAccountId, testMetaConnection } from "@/lib/adapters/meta";

export const dynamic = "force-dynamic";

/** Lista conexiones Meta (sin exponer token completo). Requiere admin para ver lista. */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const connections = await listMetaConnectionsSafe();
  const hasActive = connections.some((c) => c.isActive);
  return NextResponse.json({ connections, hasActive });
}

/** Crea o actualiza conexión Meta — plug & play. */
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 80) : "Meta Ads";
  const adAccountIdRaw = typeof body.adAccountId === "string" ? body.adAccountId : "";
  const accessToken = typeof body.accessToken === "string" ? body.accessToken.trim() : "";
  const appId = typeof body.appId === "string" && body.appId.trim() ? body.appId.trim() : null;
  const appSecret = typeof body.appSecret === "string" && body.appSecret.trim() ? body.appSecret.trim() : null;
  const pixelId = typeof body.pixelId === "string" && body.pixelId.trim() ? body.pixelId.trim() : null;
  const businessId = typeof body.businessId === "string" && body.businessId.trim() ? body.businessId.trim() : null;

  if (!adAccountIdRaw || !accessToken) {
    return NextResponse.json({ error: "adAccountId y accessToken son requeridos" }, { status: 400 });
  }

  let normalized: string;
  try {
    normalized = normalizeAdAccountId(adAccountIdRaw);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }

  // Valida contra Graph API antes de guardar
  const test = await testMetaConnection(accessToken, normalized);
  if (!test.ok) {
    return NextResponse.json({ error: `No se pudo validar con Meta: ${test.error}. Verifica token y Ad Account ID.` }, { status: 400 });
  }

  // Si ya existe una con mismo adAccountId, actualiza
  const existing = await prisma.metaConnection.findFirst({ where: { adAccountId: normalized } });
  if (existing) {
    const updated = await prisma.metaConnection.update({
      where: { id: existing.id },
      data: {
        name,
        accessToken,
        appId,
        appSecret,
        pixelId,
        businessId,
        isActive: true,
        lastSyncStatus: "OK",
        lastError: null,
        config: { ...(existing.config as Record<string, unknown> ?? {}), accountName: test.accountName, currency: test.currency, validatedAt: new Date().toISOString() },
      },
    });
    return NextResponse.json({ ok: true, connection: { id: updated.id, name: updated.name, adAccountId: updated.adAccountId } });
  }

  const created = await prisma.metaConnection.create({
    data: {
      name,
      adAccountId: normalized,
      accessToken,
      appId,
      appSecret,
      pixelId,
      businessId,
      isActive: true,
      lastSyncStatus: "OK",
      config: { accountName: test.accountName, currency: test.currency, validatedAt: new Date().toISOString() },
    },
  });
  return NextResponse.json({ ok: true, connection: { id: created.id, name: created.name, adAccountId: created.adAccountId } }, { status: 201 });
}
