import { NextResponse } from "next/server";
import { reportAbandonedCart } from "@/lib/emails/processor";

export const dynamic = "force-dynamic";

/**
 * Reporte de carro abandonado desde una tienda (StarShop u otra).
 * Upsert por cartKey y lo inscribe en las secuencias activas.
 */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  try {
    if (!b.email || typeof b.email !== "string") {
      return NextResponse.json({ error: "email requerido" }, { status: 400 });
    }
    const items: { title: string; qty: number; price: number }[] = Array.isArray(b.items)
      ? b.items.map((i: Record<string, unknown>) => ({
          title: String(i.title ?? "Producto"),
          qty: Number(i.qty ?? 1),
          price: Number(i.price ?? 0),
        }))
      : [];
    const cart = await reportAbandonedCart({
      cartKey: typeof b.cartKey === "string" ? b.cartKey : undefined,
      email: b.email,
      customerName: typeof b.customerName === "string" ? b.customerName : undefined,
      items,
      total: Number(b.total ?? items.reduce((a, i) => a + i.price * i.qty, 0)),
      currency: typeof b.currency === "string" ? b.currency : "CLP",
      recoverUrl: typeof b.recoverUrl === "string" ? b.recoverUrl : undefined,
    });
    return NextResponse.json({ ok: true, id: cart.id }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
