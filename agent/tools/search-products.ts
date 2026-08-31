import { z } from "zod";
import { defineTool } from "@/lib/eve/defineTool";
import { getStoreAdapterForStore } from "@/lib/adapters/store";

export default defineTool({
  description: "Busca productos por título o SKU para el agente.",
  inputSchema: z.object({
    storeId: z.string(),
    query: z.string(),
    limit: z.number().min(1).max(20).default(5),
  }),
  async execute({ storeId, query, limit }) {
    const { adapter } = await getStoreAdapterForStore(storeId);
    const products = await adapter.listProducts(storeId);
    const q = query.toLowerCase();
    const filtered = products.filter((p) => p.title.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)).slice(0, limit);
    return { products: filtered };
  },
});
