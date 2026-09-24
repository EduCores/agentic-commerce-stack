import { prisma } from "../src/lib/adapters/prisma";

async function main() {
  const agents = await prisma.agent.findMany({
    select: { slug: true, model: true },
    where: { slug: { startsWith: "starshop" } },
  });
  console.log("StarShop agents:");
  for (const a of agents) {
    console.log(`  ${a.slug}: ${a.model}`);
  }

  const sales = await prisma.agent.findUnique({
    where: { slug: "sales-assistant" },
    select: { slug: true, model: true },
  });
  console.log("\nSales assistant:");
  console.log(`  ${sales?.slug}: ${sales?.model}`);

  await prisma.$disconnect();
}

main().catch(console.error);