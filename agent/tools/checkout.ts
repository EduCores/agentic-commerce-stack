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
    const path = flow === "b2b" ? `/cotizacion?sku=${sku}&qty=${qty}` : `/checkout?sku=${sku}&qty=${qty}`;
    return { checkoutUrl: path, sku, qty, flow, message: `Checkout ${flow} iniciado para ${sku} x${qty}` };
  },
});
