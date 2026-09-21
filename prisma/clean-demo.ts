/**
 * ACS — Limpia los datos demo creados por prisma/seed-demo.ts.
 * Elimina: WorkflowRuns/step logs, AgentRuns, Orders (+items) y Customers marcados demo.
 * Conserva: tienda, catálogo, agentes, prompts y workflows (los de seed.ts).
 */
import "dotenv/config";
import { prisma } from "../src/lib/adapters/prisma";

async function main() {
  const demoOrders = await prisma.order.findMany({ where: { metadata: { path: ["demo"], equals: true } }, select: { id: true } });
  const ids = demoOrders.map((o) => o.id);
  if (ids.length) {
    const wr = await prisma.workflowRun.deleteMany({ where: { orderId: { in: ids } } });
    const or = await prisma.order.deleteMany({ where: { id: { in: ids } } });
    console.log(`workflowRunsDeleted=${wr.count} ordersDeleted=${or.count}`);
  } else {
    console.log("ordersDeleted=0");
  }

  const ar = await prisma.agentRun.deleteMany({ where: { input: { path: ["demo"], equals: true } } });
  console.log(`agentRunsDeleted=${ar.count}`);

  const dc = await prisma.customer.deleteMany({ where: { metadata: { path: ["demo"], equals: true } } });
  console.log(`customersDeleted=${dc.count}`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
