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
  // Modelo de PRUEBAS: Qwen gratuito de la cadena de fallback (ver
  // STARSHOP_CREW_FALLBACKS en prisma/starshop-prompts.ts). Si el upstream
  // responde 429, runAgent encadena al siguiente modelo gratis solo.
  const TEST_MODEL = "qwen/qwen3.8-27b:free";
  const original = await prisma.agent.findUnique({ where: { slug: "sales-assistant" }, select: { model: true } });
  const updated = await prisma.agent.update({
    where: { slug: "sales-assistant" },
    data: { model: TEST_MODEL },
    select: { slug: true, model: true },
  });
  console.log("UPDATED:", JSON.stringify(updated));

  // Prueba E2E: consulta que DEBE disparar searchProducts
  const { runAgent } = await import("../agent/index");
  const r = await runAgent({
    agentSlug: "sales-assistant",
    input: "Hola, necesito un proyector led para exterior. ¿Tienen? ¿precio?",
  });
  const stepTools = r.toolCalls.map((t: unknown) => (t as { toolName?: string }).toolName);
  console.log("--- TOOL CALLS (all steps):", JSON.stringify(stepTools));
  console.log("--- RESPONSE:\n" + r.text.slice(0, 600));

  // Prueba anti-alucinación: producto que NO existe
  const r2 = await runAgent({
    agentSlug: "sales-assistant",
    input: "¿Tienen sillas ergonómicas para oficina?",
  });
  const stepTools2 = r2.toolCalls.map((t: unknown) => (t as { toolName?: string }).toolName);
  console.log("--- TEST2 TOOL CALLS:", JSON.stringify(stepTools2));
  console.log("--- TEST2 RESPONSE:\n" + r2.text.slice(0, 600));

  // Prueba 3: flujo multi-tool (buscar producto -> consultar stock)
  const r3 = await runAgent({
    agentSlug: "sales-assistant",
    input: "¿Cuántas unidades tienen en stock del Proyector LED 200W?",
  });
  const stepTools3 = r3.toolCalls.map((t: unknown) => (t as { toolName?: string }).toolName);
  console.log("--- TEST3 TOOL CALLS:", JSON.stringify(stepTools3));
  console.log("--- TEST3 RESPONSE:\n" + r3.text.slice(0, 600));

  // Prueba 4: categoría distinta (instrumentos) para probar el motor de búsqueda
  const r4 = await runAgent({
    agentSlug: "sales-assistant",
    input: "necesito un multimetro para medir corriente, ¿qué tienen?",
  });
  const stepTools4 = r4.toolCalls.map((t: unknown) => (t as { toolName?: string }).toolName);
  console.log("--- TEST4 TOOL CALLS:", JSON.stringify(stepTools4));
  console.log("--- TEST4 RESPONSE:\n" + r4.text.slice(0, 600));

  // Restaura el modelo original para no dejar la BD en modo pruebas.
  if (original?.model && original.model !== TEST_MODEL) {
    await prisma.agent.update({ where: { slug: "sales-assistant" }, data: { model: original.model } });
    console.log("RESTORED model:", original.model);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("ERR:", e?.message ?? e);
  process.exit(1);
});