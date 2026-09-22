import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/prisma";
import { renderCustomEmail, PREVIEW_VARS } from "@/lib/emails/render";
import type { EmailVars } from "@/lib/emails/templates";

export const dynamic = "force-dynamic";

/**
 * Vista previa en vivo del editor: recibe los campos (o un templateId)
 * y devuelve subject + html renderizados con datos de ejemplo.
 */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const vars: EmailVars = { ...PREVIEW_VARS, ...(b.vars ?? {}) };

  if (typeof b.templateId === "string" && !b.fields) {
    const t = await prisma.emailTemplate.findUnique({ where: { id: b.templateId } });
    if (!t) return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });
    return NextResponse.json(
      renderCustomEmail(
        {
          subject: t.subject,
          preheader: t.preheader,
          headerTitle: t.headerTitle,
          body: t.body,
          buttonText: t.buttonText,
          buttonUrl: t.buttonUrl,
        },
        vars
      )
    );
  }

  const f = b.fields ?? b;
  if (!f.subject || !f.body) {
    return NextResponse.json({ error: "subject y body son requeridos" }, { status: 400 });
  }
  return NextResponse.json(
    renderCustomEmail(
      {
        subject: String(f.subject),
        preheader: typeof f.preheader === "string" ? f.preheader : "",
        headerTitle: String(f.headerTitle ?? "Mensaje StarShop"),
        body: String(f.body),
        buttonText: typeof f.buttonText === "string" ? f.buttonText : null,
        buttonUrl: typeof f.buttonUrl === "string" ? f.buttonUrl : null,
      },
      vars
    )
  );
}
