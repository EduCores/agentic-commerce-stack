import { prisma } from "../src/lib/adapters/prisma";
import { SALES_SYSTEM_PROMPT } from "./sales-system-prompt";
import { STARSHOP_CREW_MODEL } from "./starshop-prompts";

async function main() {
  // El modelo sale del código (STARSHOP_CREW_MODEL), igual que seed.ts: así DB
  // y código no pueden divergir según el último script corrido. (Escribir un ID
  // fuera del allowlist —ej: nemotron sin ":free"— pagaba un round-trip con 402.)
  const result = await prisma.agent.updateMany({
    where: { slug: "sales-assistant" },
    data: {
      systemPrompt: SALES_SYSTEM_PROMPT,
      model: STARSHOP_CREW_MODEL,
    },
  });
  console.log(`prompt + modelo actualizados para ${result.count} agente(s) ("sales-assistant")`);
}

main().finally(() => prisma.$disconnect());
