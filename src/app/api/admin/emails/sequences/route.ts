import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/prisma";
import { parseSteps } from "@/lib/emails/processor";
import { ensureDefaultSequence } from "@/lib/emails/templates";
import { requireAdmin } from "@/lib/emails/admin-guard";

export const dynamic = "force-dynamic";

/** Lista secuencias con conteo de inscripciones activas. */
export async function GET() {
  await ensureDefaultSequence();
  const sequences = await prisma.emailSequence.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { enrollments: true } } },
  });
  return NextResponse.json({ sequences });
}

/** Crea una secuencia (solo admin). steps: [{ waitHours, templateKey, subject? }]. */
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  if (!b.name || typeof b.name !== "string") {
    return NextResponse.json({ error: "name requerido" }, { status: 400 });
  }
  const steps = parseSteps(b.steps);
  if (steps.length === 0) {
    return NextResponse.json({ error: "Agrega al menos 1 paso válido (waitHours + templateKey)" }, { status: 400 });
  }
  // Valida que las plantillas existan y estén activas.
  const keys = [...new Set(steps.map((s) => s.templateKey))];
  const found = await prisma.emailTemplate.findMany({ where: { key: { in: keys }, isActive: true }, select: { key: true } });
  const missing = keys.filter((k) => !found.some((f) => f.key === k));
  if (missing.length > 0) {
    return NextResponse.json({ error: `Plantillas no encontradas o inactivas: ${missing.join(", ")}` }, { status: 400 });
  }
  const created = await prisma.emailSequence.create({
    data: {
      name: b.name.slice(0, 80),
      description: typeof b.description === "string" ? b.description.slice(0, 280) : null,
      trigger: typeof b.trigger === "string" && b.trigger === "MANUAL" ? "MANUAL" : "ABANDONED_CART",
      steps,
      isActive: b.isActive !== false,
    },
  });
  return NextResponse.json({ sequence: created }, { status: 201 });
}
