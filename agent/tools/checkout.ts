import { z } from "zod";
import { defineTool } from "@/lib/eve/defineTool";

export default defineTool({
  description: "Inicia checkout en StarShop. Lleva al cliente a /checkout o /cotizacion con el producto.",
  inputSchema: z.object({
    sku: z.string(),
    qty: z.number().min(1).default(1),
    flow: z.enum(["minorista", "b2b"]).optional().default("minorista"),
  }),
  async execute({ sku, qty, flow }) {
    // El SKU viaja en la query: se codifica (un SKU con espacios o "&" rompía
    // la URL y el widget la rechazaba en safeNavPath).
    const q = `sku=${encodeURIComponent(sku)}&qty=${qty}`;
    const path = flow === "b2b" ? `/cotizacion?${q}` : `/checkout?${q}`;
    return { checkoutUrl: path, sku, qty, flow, message: `Checkout ${flow} iniciado para ${sku} x${qty}` };
  },
});
