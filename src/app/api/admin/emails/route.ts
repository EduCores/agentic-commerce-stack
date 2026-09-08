import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, AUTH_COOKIE } from "@/lib/auth";
import { buildTemplate, EMAIL_TEMPLATE_KINDS, type EmailTemplateKind } from "@/lib/eve/email-templates";

export const dynamic = "force-dynamic";

function isKind(v: unknown): v is EmailTemplateKind {
  return typeof v === "string" && (EMAIL_TEMPLATE_KINDS as string[]).includes(v);
}

export async function GET() {
  const previews = EMAIL_TEMPLATE_KINDS.map((kind) => {
    const built = buildTemplate(kind, { orderId: "DEMO-1001", to: "dueño@starshop.cl" });
    return { kind, ...built };
  });
  return NextResponse.json({ previews, mocked: !process.env.RESEND_API_KEY });
}

export async function POST(req: Request) {
  const token = (await cookies()).get(AUTH_COOKIE.name)?.value;
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const session = await verifySessionToken(token);
  if (!session) return NextResponse.json({ error: "Sesión expirada" }, { status: 401 });

  const { to, template, orderId, subject, text } = await req.json().catch(() => ({}));
  if (!to || !isKind(template)) {
    return NextResponse.json({ error: "to (email) y template válido requeridos" }, { status: 400 });
  }
  const { default: sendEmail } = await import("@/../agent/tools/send-email");
  const result = await sendEmail.execute({
    to,
    subject: subject ?? "Prueba StarShop",
    text,
    orderId,
    template,
  } as never);
  return NextResponse.json(result);
}
