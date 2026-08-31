import { z } from "zod";
import { defineTool } from "@/lib/eve/defineTool";
import { getStoreAdapterForStore } from "@/lib/adapters/store";

export default defineTool({
  description: "Consulta stock disponible de un SKU en una tienda.",
  inputSchema: z.object({
    storeId: z.string(),
    sku: z.string(),
    qty: z.number().min(1).default(1),
  }),
  async execute({ storeId, sku, qty }) {
    const { adapter } = await getStoreAdapterForStore(storeId);
    const check = await adapter.checkStock(storeId, sku, qty);
    return check;
  },
});
