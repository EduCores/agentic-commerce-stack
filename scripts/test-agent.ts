import { prisma } from "../src/lib/adapters/prisma";

async function main() {
  const updated = await prisma.agent.update({
    where: { slug: "sales-assistant" },
    data: { model: "qwen/qwen3-30b-a3b-instruct-2507" },
    select: { slug: true, model: true },
  });
  console.log("UPDATED:", JSON.stringify(updated));

  // Prueba E2E: consulta que DEBE disparar searchProducts
  const { runAgent } = await import("../agent/index");
  const r = await runAgent({
    agentSlug: "sales-assistant",
    input: "Hola, necesito un proyector led para exterior. ¿Tienen? ¿precio?",
  });
  const stepTools = r.steps.flatMap((s: { toolCalls: { toolName: string }[] }) =>
    s.toolCalls.map((t) => t.toolName)
  );
  console.log("--- TOOL CALLS (all steps):", JSON.stringify(stepTools));
  console.log("--- RESPONSE:\n" + r.text.slice(0, 600));

  // Prueba anti-alucinación: producto que NO existe
  const r2 = await runAgent({
    agentSlug: "sales-assistant",
    input: "¿Tienen sillas ergonómicas para oficina?",
  });
  const stepTools2 = r2.steps.flatMap((s: { toolCalls: { toolName: string }[] }) =>
    s.toolCalls.map((t) => t.toolName)
  );
  console.log("--- TEST2 TOOL CALLS:", JSON.stringify(stepTools2));
  console.log("--- TEST2 RESPONSE:\n" + r2.text.slice(0, 600));

  // Prueba 3: flujo multi-tool (buscar producto -> consultar stock)
  const r3 = await runAgent({
    agentSlug: "sales-assistant",
    input: "¿Cuántas unidades tienen en stock del Proyector LED 200W?",
  });
  const stepTools3 = r3.steps.flatMap((s: { toolCalls: { toolName: string }[] }) =>
    s.toolCalls.map((t) => t.toolName)
  );
  console.log("--- TEST3 TOOL CALLS:", JSON.stringify(stepTools3));
  console.log("--- TEST3 RESPONSE:\n" + r3.text.slice(0, 600));

  // Prueba 4: categoría distinta (instrumentos) para probar el motor de búsqueda
  const r4 = await runAgent({
    agentSlug: "sales-assistant",
    input: "necesito un multimetro para medir corriente, ¿qué tienen?",
  });
  const stepTools4 = r4.steps.flatMap((s: { toolCalls: { toolName: string }[] }) =>
    s.toolCalls.map((t) => t.toolName)
  );
  console.log("--- TEST4 TOOL CALLS:", JSON.stringify(stepTools4));
  console.log("--- TEST4 RESPONSE:\n" + r4.text.slice(0, 600));

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("ERR:", e?.message ?? e);
  process.exit(1);
});