import { z } from "zod";
import { defineTool } from "@/lib/eve/defineTool";
import { prisma } from "@/lib/adapters/prisma";
import { REGION_COSTS, zoneForRegion } from "../lib/shipping-zones";

const regionCosts = REGION_COSTS;

/**
 * Zona de despacho según la tarifa oficial StarShop (ver agent/lib/shipping-zones.ts).
 * Re-export local para no romper importadores existentes.
 */
export { zoneForRegion };

export default defineTool({
  description: "Calcula precio total con volumen (tier) y despacho por región. Usa sku, cantidad y región. Pasa storeId de la tienda cuando lo conozcas.",
  inputSchema: z.object({
    // Opcional SIN default: con .default() el tipo de execute lo vuelve requerido
    // y rompía los callers directos (scripts/test-validation-suite.ts). El
    // fallback a seed-store se aplica abajo con ??.
    storeId: z.string().optional(),
    sku: z.string(),
    qty: z.number().min(1).default(1),
    region: z.string().optional().default("Región Metropolitana"),
  }),
  async execute({ storeId, sku, qty, region }) {
    const sid = storeId ?? "seed-store";
    const product = await prisma.product.findFirst({ where: { sku, storeId: sid } });
    if (!product) throw new Error(`Producto no encontrado: ${sku}`);
    // Precio por volumen simple: si qty>=10 15% off, >=5 8% off
    let unitPrice = Number(product.price);
    if (qty >= 10) unitPrice = Math.round(unitPrice * 0.85);
    else if (qty >= 5) unitPrice = Math.round(unitPrice * 0.92);
    const subtotal = unitPrice * qty;
    const zone = zoneForRegion(region);
    const ship = regionCosts[zone] ?? regionCosts["rm"];
    const shipping = subtotal >= 49990 && zone === "rm" ? 0 : ship.cost;
    const total = subtotal + shipping;
    return {
      sku,
      title: product.title,
      unitPrice,
      qty,
      subtotal,
      zone,
      shipping,
      shippingDays: ship.days,
      total,
      region,
      currency: product.currency,
    };
  },
});
