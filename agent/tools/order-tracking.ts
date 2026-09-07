import { z } from "zod";
import { defineTool } from "@/lib/eve/defineTool";
import { prisma } from "@/lib/adapters/prisma";

/**
 * Order Tracking Tool — WISMO
 * Consulta estado de pedido por orderId, email o teléfono. Devuelve Order + WorkflowRun + últimos OrderStepLogs.
 * No requiere storeId; busca global y filtra por el más reciente si hay ambiguity.
 */
export default defineTool({
  description:
    "Consulta el estado de un pedido (WISMO: ¿dónde está mi pedido?). Busca por orderId, email o teléfono. Devuelve estado, pago, fulfillment y progreso del workflow.",
  inputSchema: z.object({
    orderId: z.string().optional().describe("ID del pedido (cuid). Si no se tiene, usar email/telefono"),
    email: z.string().email().optional().describe("Email del cliente para buscar pedidos recientes"),
    phone: z.string().optional().describe("Teléfono del cliente"),
  }),
  async execute({ orderId, email, phone }) {
    try {
      if (orderId) {
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          include: { items: { include: { product: { select: { sku: true, title: true } } } }, workflowRuns: { orderBy: { createdAt: "desc" }, take: 1 }, stepLogs: { orderBy: { createdAt: "desc" }, take: 10 } },
        });
        if (!order) return { ok: false, error: `Pedido no encontrado: ${orderId}`, hint: "Pide email o número de pedido para buscar." };
        return {
          ok: true,
          order: { id: order.id, status: order.status, paymentStatus: order.paymentStatus, fulfillmentStatus: order.fulfillmentStatus, total: order.total, createdAt: order.createdAt },
          items: order.items.map((i) => ({ sku: i.product.sku, title: i.product.title, qty: i.quantity, price: i.price })),
          workflow: order.workflowRuns[0] ? { id: order.workflowRuns[0].id, status: order.workflowRuns[0].status, currentStep: order.workflowRuns[0].currentStep } : null,
          stepLogs: order.stepLogs.map((s) => ({ stepName: s.stepName, status: s.status, createdAt: s.createdAt })),
        };
      }

      // Buscar por email/phone → pedidos recientes
      if (email || phone) {
        const customer = await prisma.customer.findFirst({
          where: { OR: [email ? { email } : {}, phone ? { phone } : {}].filter((o) => Object.keys(o).length > 0) as never },
          include: { orders: { orderBy: { createdAt: "desc" }, take: 5, include: { items: { include: { product: { select: { sku: true, title: true } } } } } } },
        });
        if (!customer || customer.orders.length === 0) return { ok: false, error: "No se encontraron pedidos para ese email/teléfono." };
        return {
          ok: true,
          customer: { email: customer.email, phone: customer.phone, name: customer.name },
          orders: customer.orders.map((o) => ({ id: o.id, status: o.status, paymentStatus: o.paymentStatus, fulfillmentStatus: o.fulfillmentStatus, total: o.total, createdAt: o.createdAt, items: o.items.map((i) => ({ sku: i.product.sku, qty: i.quantity })) })),
        };
      }

      return { ok: false, error: "Debes proveer orderId, email o phone." };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
});
