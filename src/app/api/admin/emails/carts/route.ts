import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/prisma";
import { requireAdmin } from "@/lib/emails/admin-guard";

export const dynamic = "force-dynamic";

/** Carros abandonados (solo admin: contiene emails de clientes). */
export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const status = new URL(req.url).searchParams.get("status");
  const carts = await prisma.cartAbandonment.findMany({
    where: status ? { status } : undefined,
    orderBy: { lastActivityAt: "desc" },
    take: 100,
  });
  const counts = await prisma.cartAbandonment.groupBy({
    by: ["status"],
    _count: { status: true },
  });
  return NextResponse.json({
    carts: carts.map((c) => ({ ...c, total: Number(c.total) })),
    counts: Object.fromEntries(counts.map((c) => [c.status, c._count.status])),
  });
}
