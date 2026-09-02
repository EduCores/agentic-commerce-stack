import { prisma } from "../src/lib/adapters/prisma";
import { SALES_SYSTEM_PROMPT } from "./sales-system-prompt";

async function main() {
  const result = await prisma.agent.updateMany({
    where: { slug: "sales-assistant" },
    data: { systemPrompt: SALES_SYSTEM_PROMPT },
  });
  console.log(`prompt actualizado para ${result.count} agente(s) ("sales-assistant")`);
}

main().finally(() => prisma.$disconnect());
