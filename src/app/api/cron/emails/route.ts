import { NextResponse } from "next/server";
import { runEmailCron } from "@/lib/emails/processor";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Cron de correos automáticos (Vercel Cron + manual).
 * Si CRON_SECRET está configurado, exige Authorization: Bearer <secret>.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    const qs = new URL(req.url).searchParams.get("secret");
    if (auth !== `Bearer ${secret}` && qs !== secret) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }
  const summary = await runEmailCron();
  return NextResponse.json({ ok: true, ...summary });
}
