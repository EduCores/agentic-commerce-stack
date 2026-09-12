import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/prisma";

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

    // Ítems: resolver por SKU; si no existe el producto aún, se crea mínimo
    const resolvedItems: { productId: string; quantity: number; price: string; total: string }[] = [];
    for (const it of items) {
      const product = await prisma.product.findFirst({ where: { storeId: store.id, sku: String(it.sku) } });
      let productId: string;
      if (product) {
        productId = product.id;
      } else {
        const created = await prisma.product.create({
          data: {
            storeId: store.id,
            sku: String(it.sku),
            title: String(it.name ?? it.sku),
            price: String(it.price ?? 0),
            currency: currency ?? "CLP",
            stock: 0,
            metadata: { autoCreatedFrom: "starshop-order" },
          },
        });
        productId = created.id;
      }
      const price = Number(it.price ?? 0);
      resolvedItems.push({
        productId,
        quantity: Number(it.quantity ?? 1),
        price: String(price),
        total: String(it.total ?? price * Number(it.quantity ?? 1)),
      });
    }

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
        currency: currency ?? "CLP",
        subtotal: String(subtotal ?? 0),
        shipping: String(shipping ?? 0),
        total: String(grandTotal ?? 0),
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
