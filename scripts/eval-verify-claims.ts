/**
 * Eval del validador post-hoc de afirmaciones (npm run test:verify).
 *
 * POR QUÉ EXISTE: `verifyClaims` (agent/lib/verify-claims.ts) es la compuerta
 * que impide que el agente afirme precios/stocks/SKUs que no salieron de las
 * tools de ESTE turno. Este eval fija 12 casos: lo verificable pasa, lo
 * inventado se bloquea, y el texto de políticas/charla sin tools NO da falsos
 * positivos. Local y determinista (sin LLM ni red).
 */
import { verifyClaims, type ToolEvidence } from "../agent/lib/verify-claims";

type Case = { name: string; text: string; evidence: ToolEvidence[]; expectOk: boolean };

const SEARCH: ToolEvidence[] = [{
  toolName: "searchProducts",
  args: { q: "taladro" },
  output: {
    products: [
      { sku: "TAL-20V-01", title: "Taladro percutor 20V", price: 45990, stock: 32 },
      { sku: "TAL-12V-02", title: "Taladro 12V", price: 29990, stock: 15 },
    ],
  },
}];

const STOCK: ToolEvidence[] = [{
  toolName: "checkStock",
  args: { sku: "TAL-20V-01", qty: 2 },
  output: { sku: "TAL-20V-01", available: 32, reserved: 0, isAvailable: true },
}];

const PRICING: ToolEvidence[] = [{
  toolName: "calculatePricing",
  args: { sku: "TAL-20V-01", qty: 2, region: "rm" },
  output: { sku: "TAL-20V-01", subtotal: 91980, shipping: 3990, total: 95970 },
}];

const CASES: Case[] = [
  { name: "precio verificado pasa", text: "El taladro cuesta $45.990.", evidence: SEARCH, expectOk: true },
  { name: "precio inventado se bloquea", text: "El taladro cuesta $99.990.", evidence: SEARCH, expectOk: false },
  { name: "stock verificado pasa", text: "Tenemos stock 32 disponible.", evidence: STOCK, expectOk: true },
  { name: "stock inventado se bloquea", text: "Solo quedan 5, apúrate.", evidence: STOCK, expectOk: false },
  { name: "SKU verificado pasa", text: "El modelo TAL-20V-01 está disponible.", evidence: SEARCH, expectOk: true },
  { name: "SKU inexistente se bloquea", text: "El modelo TAL-99-XX está disponible.", evidence: SEARCH, expectOk: false },
  { name: "charla sin cifras pasa", text: "Hola, ¿en qué te ayudo hoy?", evidence: SEARCH, expectOk: true },
  { name: "política sin tools pasa (no castiga conocimiento)", text: "Despacho RM $3.990 y garantía de 3 años.", evidence: [], expectOk: true },
  { name: "despacho y total verificados pasan", text: "Son $91.980 más $3.990 de despacho: total $95.970.", evidence: PRICING, expectOk: true },
  { name: "despacho inventado se bloquea", text: "El despacho sale $5.990.", evidence: PRICING, expectOk: false },
  { name: "eco de cantidad del cliente pasa (no es afirmación de dato)", text: "Perfecto, 10 unidades del taladro, te lo cotizo.", evidence: SEARCH, expectOk: true },
  { name: "múltiples cifras, una mala, se bloquea", text: "Cuesta $45.990 y quedan 32, despacho $1.990.", evidence: [...SEARCH, ...STOCK, ...PRICING], expectOk: false },
];

let fails = 0;
console.log("=== EVAL VERIFY-CLAIMS (post-hoc) ===");
for (const c of CASES) {
  const r = verifyClaims(c.text, c.evidence);
  const pass = r.ok === c.expectOk;
  if (!pass) fails++;
  console.log(`${pass ? "OK  " : "FAIL"} ${c.name} → ok=${r.ok} (esperado ${c.expectOk})${r.violations.map((v) => ` [${v.kind}:${v.claimed}]`).join("")}`);
}
console.log(fails === 0 ? `EVALS TODO OK (${CASES.length}/${CASES.length})` : `EVALS FAIL: ${fails} caso(s)`);
process.exit(fails === 0 ? 0 : 1);
