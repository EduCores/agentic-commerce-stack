import { NextResponse } from "next/server";
import { runEmailCron } from "@/lib/emails/processor";
import { requireAdmin } from "@/lib/emails/admin-guard";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** "Procesar ahora": detecta abandonos y envía pasos vencidos (solo admin). */
export async function POST() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const summary = await runEmailCron();
  return NextResponse.json({ ok: true, ...summary });
}
