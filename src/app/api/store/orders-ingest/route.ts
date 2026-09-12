import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/adapters/prisma";
import { checkAuthRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/store/orders-ingest — Puente de entrada de órdenes del frontend StarShop.
 * El frontend (StarShop) notifica cada orden creada y cada cambio de estado de pago.
 * Mapeo de estados: PENDIENTE→PENDING | PAGADA→PAID | FALLIDA→FAILED | REEMBOLSADA→REFUNDED
 * Los ítems se resuelven por SKU contra el catálogo sincronizado (o se crean mínimos).
 */
type IngestStatus = "PENDIENTE" | "PAGADA" | "FALLIDA" | "REEMBOLSADA";

const STATUS_MAP: Record<IngestStatus, { status: "PENDING" | "PAID" | "FAILED" | "REFUNDED"; paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED" }> = {
  PENDIENTE: { status: "PENDING", paymentStatus: "PENDING" },
  PAGADA: { status: "PAID", paymentStatus: "PAID" },
  FALLIDA: { status: "FAILED", paymentStatus: "FAILED" },
  REEMBOLSADA: { status: "REFUNDED", paymentStatus: "REFUNDED" },
};

async function ensureStarshopStore() {
  const existing = await prisma.storeConnection.findFirst({ where: { provider: "starshop" } });
  if (existing) return existing;
  return prisma.storeConnection.create({
    data: {
      name: "Starshop Frontend",
      provider: "starshop",
      domain: process.env.STARSHOP_API_URL ?? "http://localhost:3000",
      config: { source: "frontend" },
    },
  });
}

export async function POST(req: Request) {
  try {
    // 1) Secreto compartido con el frontend (fail-closed: sin secreto no hay ingesta)
    const expected = process.env.STARSHOP_INGEST_SECRET || "";
    if (!expected) {
      return NextResponse.json({ error: "Puente no configurado (STARSHOP_INGEST_SECRET)" }, { status: 503 });
    }
    const given = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const a = createHash("sha256").update(given).digest();
    const b = createHash("sha256").update(expected).digest();
    if (!given || !timingSafeEqual(a, b)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // 2) Rate limit por IP (backstop anti-flood)
    const rl = checkAuthRateLimit(req, "orders-ingest", 60);
    if (!rl.allowed) {
      const { status, headers } = rateLimitResponse(rl.retryAfterSec);
      return NextResponse.json({ error: "Demasiadas peticiones. Espera un momento." }, { status, headers });
    }

    const body = await req.json().catch(() => ({}));
    const { orderId, customer, items, subtotal, shipping, grandTotal, currency, paymentMethod, paymentStatus, estimatedDays, statusUpdate, source } = body ?? {};

    if (!orderId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "orderId e items son requeridos" }, { status: 400 });
    }

    const store = await ensureStarshopStore();
    const mapped = STATUS_MAP[paymentStatus as IngestStatus] ?? { status: "PENDING", paymentStatus: "PENDING" };

    // Cliente: upsert lógico por email (email no es único en el esquema)
    let customerId: string | null = null;
    if (customer?.email) {
      const existing = await prisma.customer.findFirst({ where: { email: String(customer.email) } });
      if (existing) {
        customerId = existing.id;
        await prisma.customer.update({
          where: { id: existing.id },
          data: { name: customer.nombre ?? existing.name, phone: customer.telefono ?? existing.phone },
        });
      } else {
        const created = await prisma.customer.create({
          data: {
            email: String(customer.email),
            name: customer.nombre ?? null,
            phone: customer.telefono ?? null,
            externalId: String(orderId),
            metadata: { rut: customer.rut, direccion: customer.direccion, region: customer.region, comuna: customer.comuna },
          },
        });
        customerId = created.id;
      }
    }

    // Ítems: precio SIEMPRE desde el catálogo local (nunca del cliente).
    // SKU desconocido = 400 (el catálogo debe sincronizarse primero; no se inventan productos).
    const resolvedItems: { productId: string; quantity: number; price: string; total: string }[] = [];
    for (const it of items) {
      const qty = Math.floor(Number(it.quantity ?? 1));
      if (!Number.isFinite(qty) || qty < 1 || qty > 999) {
        return NextResponse.json({ error: `Cantidad inválida para SKU ${String(it.sku ?? "?")}` }, { status: 400 });
      }
      const product = await prisma.product.findFirst({ where: { storeId: store.id, sku: String(it.sku) } });
      if (!product) {
        return NextResponse.json({ error: `SKU desconocido: ${String(it.sku)}. Sincroniza el catálogo primero.` }, { status: 400 });
      }
      const price = Number(product.price);
      resolvedItems.push({
        productId: product.id,
        quantity: qty,
        price: String(price),
        total: String(price * qty),
      });
    }

    // Totales recalculados en servidor; si el cliente discrepa, se marca para revisión
    const serverSubtotal = resolvedItems.reduce((a, it) => a + Number(it.total), 0);
    const serverShipping = Math.max(0, Number(shipping ?? 0) || 0);
    const serverTotal = serverSubtotal + serverShipping;
    const clientTotal = Number(grandTotal ?? serverTotal);
    const totalMismatch = clientTotal !== serverTotal;

    const metadata = statusUpdate
      ? undefined
      : {
          paymentMethod,
          estimatedDays,
          region: customer?.region,
          comuna: customer?.comuna,
          direccion: customer?.direccion,
          rut: customer?.rut,
          telefono: customer?.telefono,
          source: source ?? "starshop-frontend",
          clientTotal,
          ...(totalMismatch ? { totalMismatch: true } : {}),
        };

    // Idempotente: si la orden ya existe (por externalId), solo actualiza estado
    const existingOrder = await prisma.order.findFirst({ where: { storeId: store.id, externalId: String(orderId) } });
    if (existingOrder) {
      await prisma.order.update({
        where: { id: existingOrder.id },
        data: { status: mapped.status, paymentStatus: mapped.paymentStatus, ...(metadata ? { metadata } : {}) },
      });
      return NextResponse.json({ ok: true, updated: true, orderId: existingOrder.id });
    }

    const order = await prisma.order.create({
      data: {
        storeId: store.id,
        customerId,
        externalId: String(orderId),
        status: mapped.status,
        paymentStatus: mapped.paymentStatus,
        currency: ["CLP", "USD"].includes(String(currency)) ? String(currency) : "CLP",
        subtotal: String(serverSubtotal),
        shipping: String(serverShipping),
        total: String(serverTotal),
        source: source ?? "starshop-frontend",
        ...(metadata ? { metadata } : {}),
        items: { create: resolvedItems },
      },
      include: { items: true },
    });
    return NextResponse.json({ ok: true, created: true, orderId: order.id }, { status: 201 });
  } catch (err) {
    console.error("[store/orders-ingest]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error ingiriendo orden" }, { status: 500 });
  }
}
