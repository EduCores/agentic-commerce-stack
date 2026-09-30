/**
 * Eval del núcleo del agente (npm run test:brain).
 *
 * POR QUÉ EXISTE: el cableado /api/chat (mapeo de tools, inyección de
 * navegación), sanitizePath, la detección de cuota diaria, las zonas de
 * despacho y la limpieza de queries son el corazón del proyecto y se rompieron
 * en silencio más de una vez (checkout que nunca navegaba, "Busco 'algunas
 * herramientas'", Maule cobrada como sur). Este eval fija el comportamiento
 * con casos dorados. Local y determinista: sin BD ni LLM.
 */
import { sanitizePath } from "../agent/tools/navigate";
import { zoneForRegion } from "../agent/lib/shipping-zones";
import { cleanProductQuery } from "../agent/lib/search/normalize";
import { isDailyFreeQuotaError } from "../prisma/starshop-prompts";
import { injectSearchNavigation, isLiveNavigation, mapAgentToolCalls } from "../src/app/api/chat/flow";

let fails = 0;
let total = 0;
function check(name: string, got: unknown, want: unknown) {
  total++;
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log(`${pass ? "OK  " : "FAIL"} ${name} → ${JSON.stringify(got)} (esperado ${JSON.stringify(want)})`);
}

// ─── 1. sanitizePath: espejo del allowlist del widget ───
console.log("=== sanitizePath ===");
check("busqueda con query", sanitizePath("/busqueda?q=taladro"), "/busqueda?q=taladro");
check("busqueda exacta", sanitizePath("/busqueda"), "/busqueda");
check("ficha producto", sanitizePath("/producto/TAL-20V"), "/producto/TAL-20V");
check("categoria", sanitizePath("/categoria/herramientas"), "/categoria/herramientas");
check("checkout con sku", sanitizePath("/checkout?sku=A-1&qty=2"), "/checkout?sku=A-1&qty=2");
check("cotizacion con sku", sanitizePath("/cotizacion?sku=A-1"), "/cotizacion?sku=A-1");
check("carrito", sanitizePath("/carrito"), "/carrito");
check("bloquea javascript:", sanitizePath("javascript:alert(1)"), null);
check("bloquea externa", sanitizePath("https://evil.example/x"), null);
check("bloquea protocol-relative", sanitizePath("//evil.example/x"), null);
check("bloquea /api", sanitizePath("/api/orders"), null);
check("bloquea /admin", sanitizePath("/admin"), null);
check("bloquea checkout/success", sanitizePath("/checkout/success"), null);
check("bloquea query con tag", sanitizePath("/busqueda?q=<script>"), null);

// ─── 2. Cuota diaria: solo señales diarias, nunca TPM puntual ───
console.log("=== isDailyFreeQuotaError ===");
check("openrouter free-models-per-day", isDailyFreeQuotaError('429 "free-models-per-day. Add 10 credits"'), true);
check("groq requests per day", isDailyFreeQuotaError("Rate limit reached for model on requests per day"), true);
check("TPM puntual NO agota", isDailyFreeQuotaError("Rate limit reached for model on tokens per minute (TPM): Limit 8000"), false);
check("TPM input NO agota", isDailyFreeQuotaError("Rate limit reached on input tokens per minute"), false);
check("500 NO agota", isDailyFreeQuotaError("Internal Server Error"), false);
check("402 NO agota", isDailyFreeQuotaError("402 Insufficient credits"), false);

// ─── 3. Zonas de despacho (tarifa oficial) ───
console.log("=== zoneForRegion ===");
check("RM", zoneForRegion("Región Metropolitana"), "rm");
check("Santiago", zoneForRegion("Santiago"), "rm");
check("Valparaíso", zoneForRegion("Valparaíso"), "central");
check("O'Higgins", zoneForRegion("O'Higgins"), "central");
check("Maule (era sur: bug)", zoneForRegion("Maule"), "central");
check("Antofagasta", zoneForRegion("Antofagasta"), "norte");
check("Arica (extrema oficial)", zoneForRegion("Arica"), "extremo");
check("Aysén", zoneForRegion("Aysén del General Carlos Ibáñez del Campo"), "extremo");
check("Magallanes", zoneForRegion("Magallanes"), "extremo");
check("Biobío", zoneForRegion("Biobío"), "sur");
check("vacía cae a sur", zoneForRegion(""), "sur");

// ─── 4. Limpieza de queries (espejo del widget) ───
console.log("=== cleanProductQuery ===");
check("cuantificador vago", cleanProductQuery("busco algunas herramientas"), "herramientas");
check("plural vago", cleanProductQuery("necesito algunos cables"), "cables");
check("solo genéricos", cleanProductQuery("quiero ver productos"), "");
check("algo solo", cleanProductQuery("busco algo"), "");
check("normal", cleanProductQuery("tienes alicates?"), "alicates");

// ─── 5. Mapeo de tool calls (el checkout roto vivía acá) ───
console.log("=== mapAgentToolCalls ===");
const mapped = mapAgentToolCalls([
  { toolName: "checkout", input: { sku: "TAL-20V", qty: 1 }, output: { checkoutUrl: "/checkout?sku=TAL-20V&qty=1" } },
  { toolName: "navigateTo", input: { path: "/busqueda" }, output: { navigateTo: "/busqueda?q=taladro" } },
]);
check("checkoutUrl llega a args", mapped[0].args.checkoutUrl, "/checkout?sku=TAL-20V&qty=1");
check("navigateTo llega a args.path", mapped[1].args.path, "/busqueda?q=taladro");

// ─── 6. Inyección de navegación ───
console.log("=== injectSearchNavigation ===");
const searchOk = [{ toolName: "searchProducts", args: { query: "taladro" }, output: { cleanQuery: "taladro", found: 2, noResults: false } }];
const r1 = injectSearchNavigation(searchOk);
check("con resultados inyecta", r1.toolCalls.length, 2);
check("autoQuery correcto", r1.autoQuery, "taladro");
check("destino codificado", (r1.toolCalls[1].output as Record<string, unknown>).navigateTo, "/busqueda?q=taladro");

const searchEmpty = [{ toolName: "searchProducts", args: { query: "xyz" }, output: { cleanQuery: "xyz", found: 0, noResults: true } }];
const r2 = injectSearchNavigation(searchEmpty);
check("sin resultados NO inyecta", r2.toolCalls.length, 1);
check("sin autoQuery", r2.autoQuery, "");

const searchChat = [{ toolName: "searchProducts", args: { query: "hola" }, output: { cleanQuery: "", notAProductQuery: true } }];
const r3 = injectSearchNavigation(searchChat);
check("charla NO inyecta", r3.toolCalls.length, 1);

const blocked = [
  { toolName: "searchProducts", args: { query: "taladro" }, output: { cleanQuery: "taladro", found: 2 } },
  { toolName: "navigateTo", args: { path: "/nope" }, output: { navigateTo: "", blocked: true } },
];
const r4 = injectSearchNavigation(blocked);
check("nav bloqueada no suprime fallback", r4.toolCalls.length, 3);

const live = [{ toolName: "navigateTo", args: { path: "/busqueda" }, output: { navigateTo: "/busqueda?q=taladro" } }];
const r5 = injectSearchNavigation(live);
check("nav real no duplica", r5.toolCalls.length, 1);
check("isLiveNavigation true", isLiveNavigation(live[0]), true);
check("isLiveNavigation false en bloqueada", isLiveNavigation(blocked[1]), false);

const uncertain = [{ toolName: "searchProducts", args: { query: "sierra" }, output: { cleanQuery: "sierra", found: 3, uncertain: true } }];
const r6 = injectSearchNavigation(uncertain);
check("uncertain con resultados SÍ inyecta (ventana = opciones)", r6.toolCalls.length, 2);

console.log(fails === 0 ? `EVALS TODO OK (${total}/${total})` : `EVALS FAIL: ${fails}/${total}`);
process.exit(fails === 0 ? 0 : 1);
