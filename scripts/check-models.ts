import { readFileSync } from "node:fs";

function loadEnv() {
  for (const raw of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnv();

async function main() {
  const { prisma } = await import("../src/lib/adapters/prisma");

  const agents = await prisma.agent.findMany({
    select: { slug: true, model: true },
    where: { slug: { startsWith: "starshop" } },
  });
  console.log("StarShop agents in DB:");
  for (const a of agents) {
    console.log(`  ${a.slug}: ${a.model}`);
  }

  const sales = await prisma.agent.findUnique({
    where: { slug: "sales-assistant" },
    select: { slug: true, model: true },
  });
  console.log("\nSales assistant in DB:");
  console.log(`  ${sales?.slug}: ${sales?.model}`);

  await prisma.$disconnect();
}

main().catch(console.error);
