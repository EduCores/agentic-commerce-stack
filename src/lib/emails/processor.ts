/**
 * Motor de correos automáticos — ACS.
 * - Detecta carros abandonados (pedidos PENDING con email + reporte de tiendas).
 * - Inscribe en secuencias activas y envía los pasos vencidos.
 * - Marca recuperados al pagarse y expira los antiguos.
 * Lo usa el cron (/api/cron/emails) y el botón "Procesar ahora" del admin.
 */
import { prisma } from "@/lib/adapters/prisma";
import { sendTransactionalEmail } from "./send";
import { ensureBuiltinTemplates, ensureDefaultSequence, type EmailItem } from "./templates";

export const ABANDON_HOURS = 1;
export const EXPIRE_DAYS = 7;

export type SequenceStep = { waitHours: number; templateKey: string; subject?: string };

/** Valida los pasos guardados en EmailSequence.steps (Json). */
export function parseSteps(raw: unknown): SequenceStep[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (s): s is SequenceStep =>
        typeof s === "object" &&
        s !== null &&
        typeof (s as SequenceStep).waitHours === "number" &&
        typeof (s as SequenceStep).templateKey === "string"
    )
    .map((s) => ({
      waitHours: Math.max(0, (s as SequenceStep).waitHours),
      templateKey: (s as SequenceStep).templateKey,
      subject: typeof (s as SequenceStep).subject === "string" ? (s as SequenceStep).subject : undefined,
    }));
}

function parseItems(raw: unknown): EmailItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((i) => typeof i === "object" && i !== null)
    .map((i) => {
      const o = i as Record<string, unknown>;
      return {
        title: String(o.title ?? "Producto"),
        qty: Number(o.qty ?? 1),
        price: Number(o.price ?? 0),
      };
    });
}

function money(total: number, currency: string): string {
  return `$${Math.round(total).toLocaleString("es-CL")} ${currency}`;
}

/** Reporta un carro abandonado (tiendas o detección interna) y lo inscribe en secuencias. */
export async function reportAbandonedCart(data: {
  cartKey?: string;
  email: string;
  customerName?: string;
  items: EmailItem[];
  total: number;
  currency?: string;
  recoverUrl?: string;
}) {
  const email = data.email.trim().toLowerCase();
  if (!email || !email.includes("@")) throw new Error("Email inválido");
  const currency = data.currency ?? "CLP";

  const cart = data.cartKey
    ? await prisma.cartAbandonment.upsert({
        where: { cartKey: data.cartKey },
        update: {
          email,
          customerName: data.customerName,
          items: data.items,
          total: data.total,
          currency,
          recoverUrl: data.recoverUrl,
          status: "OPEN",
          lastActivityAt: new Date(),
        },
        create: {
          cartKey: data.cartKey,
          email,
          customerName: data.customerName,
          items: data.items,
          total: data.total,
          currency,
          recoverUrl: data.recoverUrl,
          status: "OPEN",
        },
      })
    : await prisma.cartAbandonment.create({
        data: {
          email,
          customerName: data.customerName,
          items: data.items,
          total: data.total,
          currency,
          recoverUrl: data.recoverUrl,
          status: "OPEN",
        },
      });

  await enrollCart(cart.id, email, data.customerName);
  return cart;
}

async function enrollCart(cartId: string, email: string, customerName?: string, now = new Date()) {
  await ensureDefaultSequence();
  const sequences = await prisma.emailSequence.findMany({
    where: { trigger: "ABANDONED_CART", isActive: true },
  });
  let enrolled = 0;
  for (const seq of sequences) {
    const steps = parseSteps(seq.steps);
    if (steps.length === 0) continue;
    const dup = await prisma.emailSequenceEnrollment.findFirst({
      where: { sequenceId: seq.id, email, cartId, status: "ACTIVE" },
    });
    if (dup) continue;
    await prisma.emailSequenceEnrollment.create({
      data: {
        sequenceId: seq.id,
        email,
        customerName,
        cartId,
        currentStep: 0,
        nextRunAt: new Date(now.getTime() + steps[0].waitHours * 3600_000),
        status: "ACTIVE",
      },
    });
    enrolled += 1;
  }
  return enrolled;
}

/** 1) Detecta abandonos desde pedidos PENDING con email (más de ABANDON_HOURS). */
export async function detectAbandonedCarts(now = new Date()) {
  await ensureBuiltinTemplates();
  const since = new Date(now.getTime() - ABANDON_HOURS * 3600_000);
  const pending = await prisma.order.findMany({
    where: { status: "PENDING", paymentStatus: "PENDING", updatedAt: { lt: since } },
    include: { customer: true, items: { include: { product: true } } },
    take: 100,
    orderBy: { updatedAt: "asc" },
  });

  let detected = 0;
  let enrolled = 0;
  for (const o of pending) {
    const email = o.customer?.email?.trim().toLowerCase();
    if (!email || !email.includes("@")) continue;
    const cartKey = `order:${o.id}`;
    const already = await prisma.cartAbandonment.findUnique({ where: { cartKey } });
    if (already && already.status === "OPEN") continue;
    if (already && already.status !== "OPEN") continue; // ya tratado
    const items = o.items.map((it) => ({
      title: it.product.title,
      qty: it.quantity,
      price: Number(it.price),
    }));
    await reportAbandonedCart({
      cartKey,
      email,
      customerName: o.customer?.name ?? undefined,
      items,
      total: Number(o.total),
      currency: o.currency,
      recoverUrl: `/checkout?recover=1&order=${o.id}`,
    });
    detected += 1;
    enrolled += 1;
  }

  // 2) Marca recuperados: carros OPEN cuyo pedido ya se pagó.
  let recovered = 0;
  const openOrderCarts = await prisma.cartAbandonment.findMany({
    where: { status: "OPEN", cartKey: { startsWith: "order:" } },
    take: 200,
  });
  for (const c of openOrderCarts) {
    const orderId = c.cartKey?.replace("order:", "");
    if (!orderId) continue;
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (order && (order.status === "PAID" || order.status === "FULFILLED")) {
      await prisma.cartAbandonment.update({ where: { id: c.id }, data: { status: "RECOVERED" } });
      await prisma.emailSequenceEnrollment.updateMany({
        where: { cartId: c.id, status: "ACTIVE" },
        data: { status: "CANCELLED" },
      });
      recovered += 1;
    }
  }

  // 3) Expira carros OPEN muy antiguos.
  const expiredCut = new Date(now.getTime() - EXPIRE_DAYS * 24 * 3600_000);
  const expired = await prisma.cartAbandonment.updateMany({
    where: { status: "OPEN", lastActivityAt: { lt: expiredCut } },
    data: { status: "EXPIRED" },
  });

  return { detected, enrolled, recovered, expired: expired.count };
}

/** 4) Envía los pasos vencidos de las inscripciones activas. */
export async function processDueEnrollments(now = new Date()) {
  let sent = 0;
  let completed = 0;
  const due = await prisma.emailSequenceEnrollment.findMany({
    where: { status: "ACTIVE", nextRunAt: { lte: now } },
    include: { sequence: true },
    take: 100,
    orderBy: { nextRunAt: "asc" },
  });

  for (const enr of due) {
    if (!enr.sequence.isActive) {
      await prisma.emailSequenceEnrollment.update({ where: { id: enr.id }, data: { status: "CANCELLED" } });
      continue;
    }
    const steps = parseSteps(enr.sequence.steps);
    const step = steps[enr.currentStep];
    if (!step) {
      await prisma.emailSequenceEnrollment.update({ where: { id: enr.id }, data: { status: "COMPLETED" } });
      completed += 1;
      continue;
    }

    // Si el carro se recuperó o expiró, se cancela sin enviar.
    let cart: Awaited<ReturnType<typeof prisma.cartAbandonment.findUnique>> | null = null;
    if (enr.cartId) {
      cart = await prisma.cartAbandonment.findUnique({ where: { id: enr.cartId } });
      if (cart && cart.status !== "OPEN") {
        await prisma.emailSequenceEnrollment.update({ where: { id: enr.id }, data: { status: "CANCELLED" } });
        continue;
      }
    }

    const items = cart ? parseItems(cart.items) : [];
    const currency = cart?.currency ?? "CLP";
    const total = cart ? Number(cart.total) : 0;
    const result = await sendTransactionalEmail({
      to: enr.email,
      templateKey: step.templateKey,
      subject: step.subject,
      vars: {
        nombre: enr.customerName ?? cart?.customerName ?? enr.email,
        pedido: enr.cartId?.startsWith("order:") ? undefined : enr.cartId ?? undefined,
        items,
        total: money(total, currency),
        link: cart?.recoverUrl ?? "/checkout?recover=1",
        currency,
      },
    });
    if (result.ok) sent += 1;

    const next = enr.currentStep + 1;
    if (next >= steps.length) {
      await prisma.emailSequenceEnrollment.update({ where: { id: enr.id }, data: { status: "COMPLETED" } });
      completed += 1;
    } else {
      await prisma.emailSequenceEnrollment.update({
        where: { id: enr.id },
        data: {
          currentStep: next,
          nextRunAt: new Date(now.getTime() + steps[next].waitHours * 3600_000),
        },
      });
    }
  }

  return { sent, completed, checked: due.length };
}

/** Orquesta todo: lo usa el cron y el botón "Procesar ahora". */
export async function runEmailCron(now = new Date()) {
  const detection = await detectAbandonedCarts(now);
  const sending = await processDueEnrollments(now);
  return { at: now.toISOString(), detection, sending };
}
