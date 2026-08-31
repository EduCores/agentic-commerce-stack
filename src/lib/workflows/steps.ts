/**
 * ACS Workflow Steps — primitivas reutilizables para cualquier workflow de commerce
 */
import { prisma } from "@/lib/adapters/prisma";
import { getStoreAdapter } from "@/lib/adapters/store";
import { logStep } from "@/lib/workflows/engine";

// Reserva stock durable + log para XYFlow
export async function reserveStockStep(params: { orderId: string; workflowRunId?: string }) {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { items: true, store: true },
  });
  if (!order) throw new Error(`Order not found: ${params.orderId}`);

  await logStep({ workflowRunId: params.workflowRunId, orderId: params.orderId, stepName: "RESERVE_STOCK", status: "RUNNING" });

  const adapter = getStoreAdapter(order.store.provider);
  for (const item of order.items) {
    const product = await prisma.product.findUnique({ where: { id: item.productId } });
    if (!product) throw new Error(`Product not found: ${item.productId}`);
    await adapter.reserveStock(order.storeId, product.sku, item.quantity);
  }

  await prisma.order.update({ where: { id: params.orderId }, data: { status: "RESERVED" } });
  await logStep({ workflowRunId: params.workflowRunId, orderId: params.orderId, stepName: "RESERVE_STOCK", status: "COMPLETED" });
  return { ok: true };
}

export async function processPaymentStep(params: { orderId: string; workflowRunId?: string }) {
  await logStep({ workflowRunId: params.workflowRunId, orderId: params.orderId, stepName: "PROCESS_PAYMENT", status: "RUNNING" });
  // TODO: integrar Stripe/MercadoPago/etc via StoreConnection.config
  // Mock: marca como pagado tras 500ms
  await new Promise((r) => setTimeout(r, 500));
  await prisma.order.update({ where: { id: params.orderId }, data: { paymentStatus: "PAID", status: "PAID" } });
  await logStep({ workflowRunId: params.workflowRunId, orderId: params.orderId, stepName: "PROCESS_PAYMENT", status: "COMPLETED" });
  return { ok: true };
}

export async function fulfillOrderStep(params: { orderId: string; workflowRunId?: string }) {
  await logStep({ workflowRunId: params.workflowRunId, orderId: params.orderId, stepName: "FULFILL", status: "RUNNING" });
  await prisma.order.update({ where: { id: params.orderId }, data: { fulfillmentStatus: "FULFILLED", status: "FULFILLED" } });
  // Libera reserva (stock ya descontado) — aquí solo log
  await logStep({ workflowRunId: params.workflowRunId, orderId: params.orderId, stepName: "FULFILL", status: "COMPLETED" });
  return { ok: true };
}

export async function cancelOrderStep(params: { orderId: string; reason: string; workflowRunId?: string }) {
  await logStep({ workflowRunId: params.workflowRunId, orderId: params.orderId, stepName: "CANCEL", status: "RUNNING", input: { reason: params.reason } });
  const order = await prisma.order.findUnique({ where: { id: params.orderId }, include: { items: true, store: true } });
  if (order) {
    const adapter = getStoreAdapter(order.store.provider);
    for (const item of order.items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (product) await adapter.releaseStock(order.storeId, product.sku, item.quantity).catch(() => null);
    }
  }
  await prisma.order.update({ where: { id: params.orderId }, data: { status: "CANCELLED" } });
  await logStep({ workflowRunId: params.workflowRunId, orderId: params.orderId, stepName: "CANCEL", status: "COMPLETED" });
  return { ok: true };
}
