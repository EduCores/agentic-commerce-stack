import { z } from "zod";
import { defineTool } from "@/lib/eve/defineTool";
import { prisma } from "@/lib/adapters/prisma";

const regionCosts: Record<string, { cost: number; days: string }> = {
  rm: { cost: 3990, days: "24-48h" },
  central: { cost: 4990, days: "48-72h" },
  norte: { cost: 6990, days: "3-4 días" },
  sur: { cost: 6990, days: "3-4 días" },
  extremo: { cost: 9990, days: "4-6 días" },
};

export default defineTool({
  description: "Calcula precio total con volumen (tier) y despacho por región. Usa sku, cantidad y región.",
  inputSchema: z.object({
    sku: z.string(),
    qty: z.number().min(1).default(1),
    region: z.string().optional().default("Región Metropolitana"),
  }),
  async execute({ sku, qty, region }) {
    const product = await prisma.product.findFirst({ where: { sku, storeId: "seed-store" } });
    if (!product) throw new Error(`Producto no encontrado: ${sku}`);
    const tiers = (product as any).metadata as any;
    // Precio por volumen simple: si qty>=10 15% off, >=5 8% off
    let unitPrice = Number(product.price);
    if (qty >= 10) unitPrice = Math.round(unitPrice * 0.85);
    else if (qty >= 5) unitPrice = Math.round(unitPrice * 0.92);
    const subtotal = unitPrice * qty;
    const zone = region.toLowerCase().includes("metropolitana") ? "rm" : region.toLowerCase().includes("valpara") || region.toLowerCase().includes("o'higgins") ? "central" : "sur";
    const ship = regionCosts[zone] ?? regionCosts["rm"];
    const shipping = subtotal >= 49990 && zone === "rm" ? 0 : ship.cost;
    const total = subtotal + shipping;
    return {
      sku,
      title: product.title,
      unitPrice,
      qty,
      subtotal,
      shipping,
      shippingDays: ship.days,
      total,
      region,
      currency: product.currency,
    };
  },
});
