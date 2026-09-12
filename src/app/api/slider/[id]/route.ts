import { NextResponse } from "next/server";
import {
  deleteStarshopSlide,
  updateStarshopSlide,
} from "@/lib/starshop";

export const dynamic = "force-dynamic";

// PUT /api/slider/:id — actualiza slide (proxy a StarShop)
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const updated = await updateStarshopSlide(Number(id), body);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error actualizando slide" },
      { status: 502 },
    );
  }
}

// DELETE /api/slider/:id — elimina slide (proxy a StarShop)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const deleted = await deleteStarshopSlide(Number(id));
    return NextResponse.json(deleted);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error eliminando slide" },
      { status: 502 },
    );
  }
}
