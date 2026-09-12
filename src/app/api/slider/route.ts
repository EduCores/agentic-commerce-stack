import { NextResponse } from "next/server";
import {
  createStarshopSlide,
  fetchStarshopSlides,
} from "@/lib/starshop";

export const dynamic = "force-dynamic";

// GET /api/slider — lista todas las slides (proxy a StarShop)
export async function GET() {
  try {
    const slides = await fetchStarshopSlides();
    return NextResponse.json({ slides });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudo contactar StarShop" },
      { status: 502 },
    );
  }
}

// POST /api/slider — crea slide (proxy a StarShop)
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const created = await createStarshopSlide(body);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error creando slide" },
      { status: 502 },
    );
  }
}
