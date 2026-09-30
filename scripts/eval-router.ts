/**
 * Eval del ROUTER de intención (npm run test:router).
 *
 * POR QUÉ EXISTE: cada mensaje del cliente pasa primero por detectIntent. Si el
 * modelo responde JSON ilegible, el router cae a la heurística y la experiencia
 * se degrada en silencio (fue el bug de "¿estás conectado?" → product_search).
 * Este eval fija la intención esperada por frase y muestra POR QUÉ CAMINO salió
 * (modelo + modo de structured outputs + fuente), para validar la escalera
 * json_schema → json_object → texto sin tocar el chat.
 *
 * Uso:
 *   npx tsx scripts/eval-router.ts              (usa la cadena real: Groq/OpenRouter)
 *   npx tsx scripts/eval-router.ts --heuristic  (fuerza heurística: sin API keys)
 *   npx tsx scripts/eval-router.ts --verbose    (imprime la traza de cada intento)
 */
import { readFileSync } from "node:fs";

function loadEnv() {
  try {
    for (const raw of readFileSync(".env", "utf8").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {}
}

loadEnv();
const VERBOSE = process.argv.includes("--verbose");
const HEURISTIC = process.argv.includes("--heuristic");
const LIMIT = Number(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 0);
if (HEURISTIC) {
  // Sin credenciales, detectIntent cae a la heurística pura (prueba de regresión).
  // Incluye las de Google: detectIntentLLM también usa GEMINI_API_KEY/GOOGLE_API_KEY.
  delete process.env.GROQ_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_ADMIN_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_API_KEY;
}

type Case = { text: string; expected: string; isAdmin?: boolean };

const CASES: Case[] = [
  { text: "hola", expected: "general_inquiry" },
  { text: "¿estás conectado?", expected: "general_inquiry" },
  { text: "estamos de vuelta?", expected: "general_inquiry" },
  { text: "gracias!", expected: "general_inquiry" },
  { text: "hola tienes taladros?", expected: "product_search" },
  { text: "busco ampolletas gu10", expected: "product_search" },
  { text: "cuanto cuesta el distanciometro", expected: "product_search" },
  { text: "cuanto vale el panel led 36w", expected: "product_search" },
  { text: "lo vi mas barato en sodimac, me igualan el precio?", expected: "price_comparison" },
  { text: "deje el carrito a medias, lo puedo retomar?", expected: "abandoned_cart" },
  { text: "donde esta mi pedido?", expected: "order_tracking" },
  { text: "quiero devolver una sierra", expected: "return_request" },
  { text: "vi el mismo taladro mas barato en otra tienda", expected: "price_comparison" },
  { text: "quiero pagar con transferencia", expected: "checkout_support" },
  { text: "cual es la politica de garantia?", expected: "general_inquiry" },
  { text: "quiero hablar con un ejecutivo", expected: "escalate_human" },
  { text: "cuanto vendi hoy?", expected: "admin_ops", isAdmin: true },
  { text: "resumen de ventas del mes", expected: "admin_ops", isAdmin: true },
];

async function main() {
  const { detectIntent, getRouterTrace, resetRouterTrace } = await import("../src/lib/eve/detect-intent");
  const { modesFor, structuredOutputsEnabled } = await import("../agent/lib/structured-output");
  const { buildModelChain } = await import("../prisma/starshop-prompts");

  console.log("=== EVAL ROUTER (detect-intent) ===");
  console.log(`modo            : ${HEURISTIC ? "heurística forzada (sin keys)" : "cadena real"}`);
  console.log(`structured out. : ${structuredOutputsEnabled("router") ? "ON" : "OFF (ACS_STRUCTURED_OUTPUTS)"}`);
  const chain = buildModelChain();
  console.log(`cadena          : ${chain.slice(0, 3).join(" → ")}${chain.length > 3 ? ` … (+${chain.length - 3})` : ""}`);
  const ladder = structuredOutputsEnabled("router") ? modesFor(chain[0] ?? "") : ["text"];
  console.log(`escalera 1º     : ${chain[0] ? `${chain[0]} → [${ladder.join(", ")}]` : "(sin modelos resolubles)"}`);
  console.log("");

  const modesUsed = new Map<string, number>();
  const total = LIMIT > 0 ? Math.min(LIMIT, CASES.length) : CASES.length;
  let fails = 0;
  let viaLLM = 0;

  for (const c of (LIMIT > 0 ? CASES.slice(0, LIMIT) : CASES)) {
    resetRouterTrace();
    const t0 = Date.now();
    const res = await detectIntent(c.text, { isAdmin: c.isAdmin });
    const ms = Date.now() - t0;
    const ok = res.intent === c.expected;
    if (!ok) fails++;
    if (res.source === "llm") viaLLM++;
    const entry = getRouterTrace().find((t) => t.status === "ok" || t.status === 200) ?? getRouterTrace().slice(-1)[0];
    if (entry) modesUsed.set(`${entry.model} · ${entry.mode}`, (modesUsed.get(`${entry.model} · ${entry.mode}`) ?? 0) + 1);
    console.log(
      `${ok ? "OK  " : "FAIL"} "${c.text.slice(0, 44)}" → ${res.intent} (esperado ${c.expected}) · ${res.source} ${res.confidence.toFixed(2)} · ${ms}ms${entry ? ` · ${entry.model} [${entry.mode}]` : ""}`
    );
    if (VERBOSE) {
      for (const t of getRouterTrace()) console.log(`      traza: ${t.model} [${t.mode}] HTTP ${t.status}${t.note ? ` (${t.note})` : ""}`);
    }
  }

  console.log("");
  console.log(`fuente LLM      : ${viaLLM}/${total}`);
  if (modesUsed.size > 0) {
    console.log("modos usados    :");
    for (const [k, v] of modesUsed) console.log(`  ${k} × ${v}`);
  }
  console.log(fails === 0 ? "\nROUTER OK" : `\nROUTER FAIL: ${fails} caso(s)`);
  if (fails > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error("Error en eval-router:", e);
  process.exitCode = 1;
});
