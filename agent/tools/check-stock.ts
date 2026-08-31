import { z } from "zod";
import { defineTool } from "@/lib/eve/defineTool";
import { getStoreAdapterForStore } from "@/lib/adapters/store";

export default defineTool({
  description: "Consulta stock disponible de un SKU en una tienda. Usa storeId seed-store si no se especifica.",
  inputSchema: z.object({
    storeId: z.string().optional().default("seed-store"),
    sku: z.string(),
    qty: z.number().min(1).default(1),
  }),
  async execute({ storeId, sku, qty }) {
    const sid = storeId ?? "seed-store";
    const { adapter } = await getStoreAdapterForStore(sid);
    const check = await adapter.checkStock(sid, sku, qty);
    return check;
  },
});
