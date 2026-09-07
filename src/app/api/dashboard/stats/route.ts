import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [productsCount, ordersCount, customersCount, agentsCount, workflowsCount, products, orders, agents, workflows] = await Promise.all([
      prisma.product.count(),
      prisma.order.count(),
      prisma.customer.count(),
      prisma.agent.count(),
      prisma.workflowDefinition.count(),
      prisma.product.findMany({ take: 5, orderBy: { updatedAt: "desc" }, select: { sku: true, title: true, price: true, stock: true } }),
      prisma.order.findMany({ take: 5, orderBy: { createdAt: "desc" }, select: { id: true, total: true, status: true, paymentStatus: true, createdAt: true, customer: { select: { name: true, email: true } } } }),
      prisma.agentRun.count(),
      prisma.workflowRun.count(),
    ]);

    const stockAgg = await prisma.product.aggregate({ _sum: { stock: true, reservedStock: true } }).catch(() => ({ _sum: { stock: 0, reservedStock: 0 } }));
    const totalStock = stockAgg._sum.stock ?? 0;
    const reserved = stockAgg._sum.reservedStock ?? 0;
    const availability = totalStock > 0 ? Math.round(((totalStock - reserved) / totalStock) * 1000) / 10 : 0;

    const revenueAgg = await prisma.order.aggregate({ _sum: { total: true }, where: { status: { in: ["PAID", "FULFILLED"] } } }).catch(() => ({ _sum: { total: 0 } }));
    const revenue = Number(revenueAgg._sum.total ?? 0);

    // Top products by order volume
    const topProductsRaw = await prisma.orderItem.groupBy({ by: ["productId"], _sum: { quantity: true }, orderBy: { _sum: { quantity: "desc" } }, take: 5 }).catch(() => []);
    const topProductIds = topProductsRaw.map((x) => x.productId);
    const topProductsMeta = topProductIds.length ? await prisma.product.findMany({ where: { id: { in: topProductIds } }, select: { id: true, title: true, sku: true, price: true, stock: true } }) : [];
    const topProducts = topProductsRaw.map((g) => {
      const p = topProductsMeta.find((x) => x.id === g.productId);
      return { product: p, quantity: g._sum.quantity };
    });

    // Sales by day (last 7 days)
    const salesByDay: { date: string; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const dayOrders = await prisma.order.findMany({ where: { createdAt: { gte: d, lt: next } }, select: { total: true } }).catch(() => []);
      const sum = dayOrders.reduce((acc, o) => acc + Number(o.total), 0);
      salesByDay.push({ date: d.toISOString().slice(0, 10), total: sum });
    }

    return NextResponse.json({
      counts: { products: productsCount, orders: ordersCount, customers: customersCount, agents: agentsCount, workflows: workflowsCount, agentRuns: agents, workflowRuns: workflows },
      stock: { total: totalStock, reserved, availability },
      revenue,
      salesByDay,
      topProducts,
      recentProducts: products,
      recentOrders: orders,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
