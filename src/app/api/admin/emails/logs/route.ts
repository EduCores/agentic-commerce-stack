import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/prisma";
import { requireAdmin } from "@/lib/emails/admin-guard";

export const dynamic = "force-dynamic";

/** Historial de envíos (solo admin). Contiene emails de clientes: protegido. */
export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const limit = Math.min(Number(new URL(req.url).searchParams.get("limit") ?? 50) || 50, 200);
  const logs = await prisma.emailLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { template: { select: { name: true, key: true } } },
  });
  return NextResponse.json({ logs });
}
