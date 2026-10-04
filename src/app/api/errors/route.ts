import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/prisma";
import { requireAdmin } from "@/lib/emails/admin-guard";

export const dynamic = "force-dynamic";

/** GET /api/errors — lista agrupada (no member: ver middleware). */
export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const rows = await prisma.errorEvent
    .findMany({ orderBy: [{ resolved: "asc" }, { lastSeenAt: "desc" }], take: 100 })
    .catch(() => []);
  return NextResponse.json({ errors: rows });
}

/** PATCH /api/errors — marcar resuelto. Body: { fingerprint: string }. */
export async function PATCH(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { fingerprint } = (await req.json().catch(() => ({}))) as { fingerprint?: string };
  if (!fingerprint) return NextResponse.json({ error: "fingerprint requerido" }, { status: 400 });
  await prisma.errorEvent
    .update({ where: { fingerprint }, data: { resolved: true, resolvedAt: new Date() } })
    .catch(() => null);
  return NextResponse.json({ ok: true });
}
