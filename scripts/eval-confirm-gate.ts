/**
 * Eval del gate pre-confirmación (npm run test:confirm).
 *
 * POR QUÉ EXISTE: `confirmOrderStep` (src/workflows/starshop-router.ts) antes
 * confirmaba cualquier orderId sin mirar la BD. El gate puro `confirmGateCheck`
 * exige: orden existente, no CANCELLED/FAILED/REFUNDED, con ítems, total > 0
 * y evidencia RESERVE_STOCK COMPLETED. Este eval fija 6 escenarios sin BD.
 * Local y determinista.
 */
import { confirmGateCheck } from "../src/workflows/starshop-router";

type Case = { name: string; order: Parameters<typeof confirmGateCheck>[0]; reserve: boolean; expectBlock: string | null };

const ITEM = { productId: "p1", quantity: 2 };

const CASES: Case[] = [
  { name: "orden inexistente se bloquea", order: null, reserve: false, expectBlock: "orden inexistente" },
  { name: "orden CANCELLED se bloquea", order: { id: "o1", status: "CANCELLED", total: 100, items: [ITEM] }, reserve: true, expectBlock: "orden en estado CANCELLED" },
  { name: "orden sin ítems se bloquea", order: { id: "o2", status: "PENDING", total: 100, items: [] }, reserve: true, expectBlock: "orden sin ítems" },
  { name: "orden con total 0 se bloquea", order: { id: "o3", status: "PENDING", total: 0, items: [ITEM] }, reserve: true, expectBlock: "orden con total no positivo" },
  { name: "orden sin reserva se bloquea", order: { id: "o4", status: "PENDING", total: 95970, items: [ITEM] }, reserve: false, expectBlock: "orden sin reserva de stock verificada (RESERVE_STOCK)" },
  { name: "orden sana con reserva pasa", order: { id: "o5", status: "PAID", total: 95970, items: [ITEM, ITEM] }, reserve: true, expectBlock: null },
];

let fails = 0;
console.log("=== EVAL CONFIRM-GATE (pre-confirmación) ===");
for (const c of CASES) {
  const got = confirmGateCheck(c.order, c.reserve);
  const pass = got === c.expectBlock;
  if (!pass) fails++;
  console.log(`${pass ? "OK  " : "FAIL"} ${c.name} → ${JSON.stringify(got)} (esperado ${JSON.stringify(c.expectBlock)})`);
}
console.log(fails === 0 ? `EVALS TODO OK (${CASES.length}/${CASES.length})` : `EVALS FAIL: ${fails} caso(s)`);
process.exit(fails === 0 ? 0 : 1);
