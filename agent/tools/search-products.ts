import { z } from "zod";
import { defineTool } from "@/lib/eve/defineTool";
import { getStoreAdapterForStore } from "@/lib/adapters/store";

export default defineTool({
  description: "Busca productos por título o SKU. Usa storeId seed-store si no se especifica.",
  inputSchema: z.object({
    storeId: z.string().optional().default("seed-store"),
    query: z.string(),
    limit: z.number().min(1).max(20).default(5),
  }),
  async execute({ storeId, query, limit }) {
    const sid = storeId ?? "seed-store";
    const { adapter } = await getStoreAdapterForStore(sid);
    const products = await adapter.listProducts(sid);
    const q = query.toLowerCase();
    const filtered = products.filter((p) => p.title.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)).slice(0, limit);
    return { products: filtered };
  },
});
