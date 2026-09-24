/**
 * Tests de regresión del guard anti pseudo tool-call (agent/lib/sanitize-reply.ts).
 * Casos reales observados en prod (Nemotron escribiendo la llamada a herramienta
 * como texto) + matriz de cortes de chunk para validar el filtro de streaming.
 * Uso: npx tsx scripts/test-sanitize-reply.ts
 */
import { createToolCallTextFilter, looksLikeReasoningDump, sanitizeReplyText, stripToolCallText } from "../agent/lib/sanitize-reply";

const LOW = (s: string) => s.replace(/\s+/g, " ").trim();

const JUNK = '{"tool": "scrapeWebsite", "args": {"url": "https://starshop.cl/politicas"}}';
const JUNK2 = '{"name": "scrapeWebsite", "arguments": {"url": "https://starshop.cl"}}';
const JUNK_XML = '<tool_call>{"name": "checkStock", "arguments": {"sku": "TAL-36W"}}</tool_call>';
const JUNK_FENCE = "```json\n" + JUNK + "\n```";
const PROSE_A = "¡Hola! Reviso la política y te cuento.";
const PROSE_B = "Cualquier cosa me dices.";

type Case = { name: string; input: string; expect: string };

const cases: Case[] = [
  { name: "json tool+args solo -> vacío", input: JUNK, expect: "" },
  { name: "dos bloques seguidos -> vacío", input: JUNK + "\n" + JUNK, expect: "" },
  { name: "name+arguments solo -> vacío", input: JUNK2, expect: "" },
  { name: "xml tool_call solo -> vacío", input: JUNK_XML, expect: "" },
  { name: "fence json tool-call solo -> vacío", input: JUNK_FENCE, expect: "" },
  { name: "json truncado sin cierre -> vacío", input: '{"tool": "scrapeWebsite", "args": {"url": "https://starshop.cl', expect: "" },
  { name: "texto normal intacto", input: PROSE_A, expect: PROSE_A },
  { name: "prosa + junk -> prosa", input: PROSE_A + "\n" + JUNK, expect: PROSE_A },
  { name: "junk + prosa -> prosa", input: JUNK + "\n" + PROSE_A, expect: PROSE_A },
  { name: "prosa + junk + prosa", input: PROSE_A + " " + JUNK + " " + PROSE_B, expect: PROSE_A + " " + PROSE_B },
  { name: "xml + prosa", input: JUNK_XML + "\n" + PROSE_B, expect: PROSE_B },
  { name: "prosa + fence junk", input: PROSE_A + "\n\n" + JUNK_FENCE, expect: PROSE_A },
  { name: "fence truncado (sin cierre)", input: PROSE_A + "\n```json\n" + JUNK, expect: PROSE_A },
  { name: "json de producto legítimo intacto", input: '{"sku": "TAL-36W", "price": 12990, "stock": 5}', expect: '{"sku": "TAL-36W", "price": 12990, "stock": 5}' },
  { name: "prosa con precio intacta", input: "El taladro sale $89.990 con despacho a Concepción.", expect: "El taladro sale $89.990 con despacho a Concepción." },
  { name: "solo emojis no se considera vacío", input: "👍", expect: "👍" },
];

let failures = 0;
function check(name: string, got: string, want: string, loose = false) {
  const ok = loose ? LOW(got) === LOW(want) : got === want;
  if (ok) {
    console.log(`  ok   ${name}`);
    return;
  }
  failures += 1;
  console.log(`  FAIL ${name}`);
  console.log(`       got : ${JSON.stringify(got)}`);
  console.log(`       want: ${JSON.stringify(want)}`);
}

console.log("== stripToolCallText ==");
for (const c of cases) {
  const loose = c.name.includes("prosa + junk") || c.name.includes("junk + prosa") || c.name.includes("fence junk");
  check(c.name, stripToolCallText(c.input), c.expect, loose);
}

console.log("== sanitizeReplyText / dumps de razonamiento ==");
const DUMP_PROD =
  "Here's a thinking process:\n\n1. **Analyze User Input:**\n - User says: \"hola, revisen en su pagina de politicas cuanto cuesta el despacho a concepcion\"\n - This starts with \"hola\" (hello) - a greeting\n\n2. **Identify Intent & Rules:**\n - Greeting present → Rule 1 applies";

const sanitizeCases: Array<{ name: string; input: string; expect: string; loose?: boolean }> = [
  { name: "dump real de prod -> vacío", input: DUMP_PROD, expect: "" },
  { name: "Thinking Process:", input: "Thinking Process:\n1. Understand the request", expect: "" },
  { name: "Let me think...", input: "Let me think about how to answer this one.", expect: "" },
  { name: "The user says...", input: "The user says: hola, necesito ayuda", expect: "" },
  { name: "I need to analyze...", input: "I need to analyze the request first.", expect: "" },
  { name: "pseudo-json + dump -> vacío", input: JUNK + "\n\n" + DUMP_PROD, expect: "" },
  { name: "respuesta legítima intacta", input: PROSE_A, expect: PROSE_A },
  { name: "respuesta con numeración legítima", input: "1. **Ofertas**: revisa las promos de la semana.", expect: "1. **Ofertas**: revisa las promos de la semana." },
  { name: "ok español legítimo", input: "Ok, te ayudo con el despacho.", expect: "Ok, te ayudo con el despacho." },
];
for (const c of sanitizeCases) check(c.name, sanitizeReplyText(c.input), c.expect, c.loose);

check("looksLikeReasoningDump(dump prod)", String(looksLikeReasoningDump(DUMP_PROD)), "true");
check("looksLikeReasoningDump(prosa)", String(looksLikeReasoningDump(PROSE_A)), "false");

console.log("== createToolCallTextFilter (matriz de cortes de chunk) ==");
function streamed(text: string, cuts: number[]): string {
  const filter = createToolCallTextFilter();
  let out = "";
  let prev = 0;
  for (const cut of cuts) {
    out += filter.push(text.slice(prev, cut));
    prev = cut;
  }
  out += filter.push(text.slice(prev));
  out += filter.flush();
  return out;
}

function cutPatterns(text: string): number[][] {
  const patterns: number[][] = [[]];
  const collect = (step: number) => {
    const cuts: number[] = [];
    for (let i = step; i < text.length; i += step) cuts.push(i);
    patterns.push(cuts);
  };
  collect(1);
  collect(3);
  collect(7);
  return patterns;
}

for (const c of cases) {
  const want = stripToolCallText(c.input);
  for (const cuts of cutPatterns(c.input)) {
    const label = cuts.length === 0 ? "1 chunk" : `${cuts.length} cortes`;
    check(`${c.name} [${label}]`, streamed(c.input, cuts), want, true);
  }
}

console.log(failures === 0 ? `\nTODO OK (${cases.length} casos x cortes)` : `\nFALLARON ${failures} checks`);
process.exit(failures === 0 ? 0 : 1);
