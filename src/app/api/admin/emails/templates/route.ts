import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/prisma";
import { ensureBuiltinTemplates, BUILTIN_TEMPLATE_KEYS } from "@/lib/emails/templates";
import { requireAdmin } from "@/lib/emails/admin-guard";

export const dynamic = "force-dynamic";

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "plantilla"
  );
}

/** Lista plantillas (crea las 4 del sistema si faltan). */
export async function GET() {
  await ensureBuiltinTemplates();
  const templates = await prisma.emailTemplate.findMany({ orderBy: [{ key: "asc" }] });
  return NextResponse.json({
    templates: templates.map((t) => ({ ...t, builtin: (BUILTIN_TEMPLATE_KEYS as readonly string[]).includes(t.key) })),
    mocked: !process.env.RESEND_API_KEY,
  });
}

/** Crea una plantilla propia (solo admin). */
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  if (!b.name || !b.subject || !b.body || !b.headerTitle) {
    return NextResponse.json({ error: "name, subject, headerTitle y body son requeridos" }, { status: 400 });
  }
  const key: string = typeof b.key === "string" && b.key.trim() ? `custom_${slugify(b.key)}` : `custom_${slugify(b.name)}_${Date.now().toString(36)}`;
  const created = await prisma.emailTemplate.create({
    data: {
      key,
      name: String(b.name).slice(0, 80),
      description: typeof b.description === "string" ? b.description.slice(0, 280) : null,
      subject: String(b.subject),
      preheader: typeof b.preheader === "string" ? b.preheader : null,
      headerTitle: String(b.headerTitle),
      body: String(b.body),
      buttonText: typeof b.buttonText === "string" && b.buttonText ? b.buttonText : null,
      buttonUrl: typeof b.buttonUrl === "string" && b.buttonUrl ? b.buttonUrl : null,
      isActive: b.isActive !== false,
    },
  });
  return NextResponse.json({ template: created }, { status: 201 });
}
