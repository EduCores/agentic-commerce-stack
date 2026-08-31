import { z } from "zod";
import { defineTool } from "@/lib/eve/defineTool";
import { cancelOrderStep } from "@/lib/workflows/steps";

export default defineTool({
  description: "Cancela un pedido y libera stock reservado.",
  inputSchema: z.object({
    orderId: z.string(),
    reason: z.string().default("Cancelado por agente"),
  }),
  async execute({ orderId, reason }) {
    const res = await cancelOrderStep({ orderId, reason });
    return { status: "Cancelado", ...res };
  },
});
