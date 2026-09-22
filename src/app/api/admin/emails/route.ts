import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/prisma";
import { ensureBuiltinTemplates, BUILTIN_TEMPLATE_KEYS } from "@/lib/emails/templates";
import { sendTransactionalEmail } from "@/lib/emails/send";
import { requireAdmin } from "@/lib/emails/admin-guard";

export const dynamic = "force-dynamic";

/** Plantillas + modo (mock o Resend real). */
export async function GET() {
  await ensureBuiltinTemplates();
  const templates = await prisma.emailTemplate.findMany({ orderBy: [{ key: "asc" }] });
  return NextResponse.json({
    templates: templates.map((t) => ({ ...t, builtin: (BUILTIN_TEMPLATE_KEYS as readonly string[]).includes(t.key) })),
    mocked: !process.env.RESEND_API_KEY,
  });
}

/** Envío de prueba desde el panel (solo admin). Usa la plantilla activa de la BD. */
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { to, templateKey, orderId, subject, text, nombre } = await req.json().catch(() => ({}));
  if (!to || typeof to !== "string" || !to.includes("@")) {
    return NextResponse.json({ error: "to (email válido) requerido" }, { status: 400 });
  }
  const result = await sendTransactionalEmail({
    to,
    templateKey: typeof templateKey === "string" ? templateKey : "general",
    subject: typeof subject === "string" ? subject : undefined,
    text: typeof text === "string" ? text : undefined,
    orderId: typeof orderId === "string" ? orderId : undefined,
    vars: {
      nombre: typeof nombre === "string" && nombre ? nombre : to,
      pedido: typeof orderId === "string" ? orderId : "DEMO-1001",
    },
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
