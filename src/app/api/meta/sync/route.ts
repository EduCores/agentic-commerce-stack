import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/emails/admin-guard";
import { syncMetaConnection } from "@/lib/adapters/meta";
import { prisma } from "@/lib/adapters/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : null;
  let targetId = id;
  if (!targetId) {
    const active = await prisma.metaConnection.findFirst({ where: { isActive: true }, orderBy: { createdAt: "desc" } });
    if (!active) return NextResponse.json({ error: "No hay conexión activa" }, { status: 404 });
    targetId = active.id;
  }
  const r = await syncMetaConnection(targetId);
  if (!r.ok) return NextResponse.json({ ok: false, error: r.error }, { status: 502 });
  return NextResponse.json({ ok: true, insight: r.insight });
}
