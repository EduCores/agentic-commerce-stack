import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/emails/admin-guard";
import { testMetaConnection } from "@/lib/adapters/meta";

export const dynamic = "force-dynamic";

/** Test de credenciales sin guardar. */
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const token = typeof body.accessToken === "string" ? body.accessToken.trim() : "";
  const adAccountId = typeof body.adAccountId === "string" ? body.adAccountId.trim() : "";
  if (!token || !adAccountId) return NextResponse.json({ error: "accessToken y adAccountId requeridos" }, { status: 400 });
  const r = await testMetaConnection(token, adAccountId);
  if (!r.ok) return NextResponse.json({ ok: false, error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true, accountName: r.accountName, currency: r.currency });
}
