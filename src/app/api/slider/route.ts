import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/prisma";

export const dynamic = "force-dynamic";

const orderBy = [{ sortOrder: "asc" as const }, { id: "asc" as const }];

function toInt(v: unknown, fallback = 0) {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? Math.trunc(n as number) : fallback;
}

// GET /api/slider — lista todos los slides locales (fuente de verdad ACS)
export async function GET() {
  try {
    const slides = await prisma.heroSlide.findMany({ orderBy });
    return NextResponse.json({ slides });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error listando slides" },
      { status: 500 },
    );
  }
}

// POST /api/slider — crea slide local
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    if (!body.title?.trim() || !body.image?.trim()) {
      return NextResponse.json({ error: "Título e imagen son requeridos" }, { status: 400 });
    }
    const created = await prisma.heroSlide.create({
      data: {
        title: String(body.title).slice(0, 120),
        subtitle: String(body.subtitle ?? "").slice(0, 160),
        description: String(body.description ?? "").slice(0, 300),
        cta: String(body.cta ?? "Ver más").slice(0, 40),
        image: String(body.image).slice(0, 2_000_000),
        bg: String(body.bg ?? "from-slate-700 to-slate-900").slice(0, 120),
        badge: String(body.badge ?? "🔥 OFERTA LIMITADA").slice(0, 60),
        sortOrder: toInt(body.sortOrder),
        active: body.active !== false,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error creando slide" },
      { status: 500 },
    );
  }
}
