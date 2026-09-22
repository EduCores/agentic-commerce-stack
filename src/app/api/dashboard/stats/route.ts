import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/prisma";
import { DEMO_MODE } from "@/lib/demo";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const rawDays = Number(url.searchParams.get("days"));
  const days = [7, 14, 21, 28].includes(rawDays) ? rawDays : 7;
  const rawMonth = Number(url.searchParams.get("month"));
  const rawYear = Number(url.searchParams.get("year"));
  const month = rawMonth >= 1 && rawMonth <= 12 ? rawMonth : null;
  const year = rawYear >= 2020 && rawYear <= 2035 ? rawYear : null;
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

    // Ventas por día/mes — soporta filtros Mes/Año además de últimos N días
    let since: Date;
    let salesByDay: { date: string; total: number }[] = [];
    let rangeOrders: { total: unknown; createdAt: Date }[] = [];
    if (month && year) {
      since = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const until = new Date(year, month, 0, 23, 59, 59, 999);
      rangeOrders = await prisma.order.findMany({ where: { createdAt: { gte: since, lte: until } }, select: { total: true, createdAt: true } }).catch(() => []);
      const daysInMonth = new Date(year, month, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const key = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const sum = rangeOrders.filter((o) => o.createdAt.toISOString().slice(0, 10) === key).reduce((acc, o) => acc + Number(o.total), 0);
        salesByDay.push({ date: key, total: sum });
      }
    } else if (year && !month) {
      since = new Date(year, 0, 1, 0, 0, 0, 0);
      const until = new Date(year, 11, 31, 23, 59, 59, 999);
      rangeOrders = await prisma.order.findMany({ where: { createdAt: { gte: since, lte: until } }, select: { total: true, createdAt: true } }).catch(() => []);
      for (let m = 1; m <= 12; m++) {
        const keyPrefix = `${year}-${String(m).padStart(2, "0")}`;
        const sum = rangeOrders.filter((o) => o.createdAt.toISOString().slice(0, 7) === keyPrefix).reduce((acc, o) => acc + Number(o.total), 0);
        salesByDay.push({ date: `${keyPrefix}-01`, total: sum });
      }
    } else {
      since = new Date();
      since.setHours(0, 0, 0, 0);
      since.setDate(since.getDate() - (days - 1));
      rangeOrders = await prisma.order.findMany({ where: { createdAt: { gte: since } }, select: { total: true, createdAt: true } }).catch(() => []);
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const sum = rangeOrders.filter((o) => o.createdAt.toISOString().slice(0, 10) === key).reduce((acc, o) => acc + Number(o.total), 0);
        salesByDay.push({ date: key, total: sum });
      }
    }

    // DEMO_MOCK: muestra ACS activo a clientes sin datos reales — quitar antes de vender (NEXT_PUBLIC_DEMO_MODE=false)
    if (DEMO_MODE && productsCount === 0 && ordersCount === 0) {
      const base = [120000, 340000, 280000, 510000, 420000, 680000, 590000];
      const demoSalesByDay = (() => {
        if (month && year) {
          const dim = new Date(year, month, 0).getDate();
          return Array.from({ length: dim }).map((_, i) => ({
            date: `${year}-${String(month).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`,
            total: base[i % base.length],
          }));
        }
        if (year && !month) {
          return Array.from({ length: 12 }).map((_, i) => ({
            date: `${year}-${String(i + 1).padStart(2, "0")}-01`,
            total: base[i % base.length],
          }));
        }
        return Array.from({ length: days }).map((_, i) => {
          const d = new Date(); d.setDate(d.getDate() - (days - 1 - i));
          return { date: d.toISOString().slice(0, 10), total: base[i % base.length] };
        });
      })();
      return NextResponse.json({
        counts: { products: 48, orders: 127, customers: 34, agents: 9, workflows: 4, agentRuns: 312, workflowRuns: 89 },
        stock: { total: 520, reserved: 38, availability: 92.7 },
        revenue: 8940000,
        salesByDay: demoSalesByDay,
        topProducts: [
          { product: { title: "Taladro percutor 20V", sku: "TAL-20V-01", price: "49990", stock: 32 }, quantity: 42 },
          { product: { title: "Sierra circular 7-1/4", sku: "SIE-714-02", price: "89990", stock: 18 }, quantity: 31 },
          { product: { title: "Panel LED 36W", sku: "LED-36W-03", price: "12990", stock: 120 }, quantity: 27 },
        ],
        recentProducts: [
          { sku: "TAL-20V-01", title: "Taladro percutor 20V", price: "49990", stock: 32 },
          { sku: "LED-36W-03", title: "Panel LED 36W", price: "12990", stock: 120 },
        ],
        recentOrders: [
          { id: "demo-ord-1", total: 149970, status: "PAID", customer: { name: "Constructora Andes" } },
          { id: "demo-ord-2", total: 89990, status: "PENDING", customer: { name: "Ferretería Sur" } },
        ],
      });
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
