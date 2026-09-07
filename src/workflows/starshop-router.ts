/**
 * StarShop Intent Router — ACS 1→2→6+3→4
 * Workflow durable que implementa el diagrama StarShop:
 * 1 Welcome And Detect Intent → 2 Route By Intent (state.detected_intent) → 3.x Crews (6 + 3 extra) → 4 Confirm Order
 * Persiste en WorkflowDefinition (graph XYFlow) y WorkflowRun/OrderStepLog para observabilidad.
 */
import { createWorkflow, createStep, logStep } from "@/lib/workflows/engine";
import type { StarShopIntent } from "../../prisma/starshop-prompts";

// ── Steps ────────────────────────────────────────────────────────────────────

export const detectIntentStep = createStep<{ message: string; history?: unknown[] }, { intent: StarShopIntent; confidence: number }>(
  "detect-intent",
  async ({ message }) => {
    // Fallback determinístico si el LLM no está disponible (heurística por keywords)
    const t = message.toLowerCase();
    let intent: StarShopIntent = "product_search";
    if (/devol|devoluci|cambio|garant/.test(t)) intent = "return_request";
    else if (/carrito abandon|dejé en el carrito|retomar compr/.test(t)) intent = "abandoned_cart";
    else if (/dónde está|donde esta|seguimiento|estado.*pedido|track/.test(t)) intent = "order_tracking";
    else if (/compara|precio.*competencia|cotiz.*otro/.test(t)) intent = "price_comparison";
    else if (/pagar|checkout|carrito.*pago|despacho.*pago|método de pago/.test(t)) intent = "checkout_support";
    else if (/política|envío|garantía|horario|contacto|quiénes son/.test(t)) intent = "general_inquiry";
    else if (/hablar con|ejecutivo|humano|ventas@/.test(t)) intent = "escalate_human";
    await logStep({ stepName: "DETECT_INTENT", status: "COMPLETED", input: { message }, output: { intent } });
    return { intent, confidence: 0.85 };
  }
);

export const routeByIntentStep = createStep<
  { intent: StarShopIntent; workflowRunId?: string; orderId?: string },
  { crew: string }
>(
  "route-by-intent",
  async ({ intent, workflowRunId, orderId }) => {
    const crewMap: Record<StarShopIntent, string> = {
      product_search: "search_and_recommend",
      price_comparison: "compare_prices",
      checkout_support: "checkout_guide",
      general_inquiry: "general_support",
      abandoned_cart: "recover_cart",
      return_request: "handle_return",
      order_tracking: "order_tracking",
      escalate_human: "escalate_human",
    };
    const crew = crewMap[intent] ?? "search_and_recommend";
    await logStep({ stepName: "ROUTE_BY_INTENT", workflowRunId, orderId, status: "COMPLETED", input: { intent }, output: { crew } });
    return { crew };
  }
);

// Generic crew step — delega al agente correspondiente (se loguea para XYFlow)
export function crewStep(crewSlug: string, nodeId: string) {
  return createStep<{ intent: StarShopIntent; message: string; workflowRunId?: string; orderId?: string }, { crew: string }>(
    crewSlug,
    async ({ message, workflowRunId, orderId }) => {
      await logStep({ stepName: crewSlug.toUpperCase(), workflowRunId, orderId, nodeId, status: "COMPLETED", input: { message }, output: { crew: crewSlug } });
      return { crew: crewSlug };
    }
  );
}

export const confirmOrderStep = createStep<{ orderId: string; workflowRunId?: string }, { orderId: string }>(
  "confirm-order",
  async ({ orderId, workflowRunId }) => {
    await logStep({ stepName: "CONFIRM_ORDER", workflowRunId, orderId, status: "COMPLETED", input: { orderId }, output: { orderId } });
    return { orderId };
  }
);

// ── Workflow 1→2→6+3→4 ───────────────────────────────────────────────────────
export const starShopRouterWorkflow = createWorkflow<{
  message: string;
  detectedIntent?: StarShopIntent;
  workflowRunId?: string;
  orderId?: string;
}>("starshop-intent-router", async ({ message, detectedIntent, workflowRunId, orderId }) => {
  const { intent } = detectedIntent
    ? { intent: detectedIntent } as { intent: StarShopIntent }
    : await detectIntentStep.fn({ message });

  const { crew } = await routeByIntentStep.fn({ intent, workflowRunId, orderId });

  // Dispatch al crew (log para XYFlow; el agente real se invoca en agent/index.ts)
  const step = crewStep(crew, `crew-${crew}`);
  await step.fn({ intent, message, workflowRunId, orderId });

  // Confirm Order solo si hay orderId (checkout completado)
  if (orderId) {
    await confirmOrderStep.fn({ orderId, workflowRunId });
  }

  return { intent, crew, orderId: orderId ?? null };
});

// ── Graph XYFlow para /workflows (persistido en WorkflowDefinition.graph) ──
export const starShopRouterGraph = {
  nodes: [
    { id: "welcome-1", type: "base", position: { x: 350, y: 20 }, data: { label: "1 Welcome And Detect Intent", description: "Saluda cálido y detecta intención (8 intents) sin llamar tools. Guarda state.detected_intent.", detail: "Entrada del flujo. Clasifica: product_search, price_comparison, checkout_support, general_inquiry, abandoned_cart, return_request, order_tracking, escalate_human. Si saludo vago, califica con 2 preguntas.", type: "trigger", status: "idle", agent: "StarShop Welcome Agent", tools: [], intent: "all", model: "qwen/qwen3-30b-a3b" } },
    { id: "route-1", type: "base", position: { x: 350, y: 140 }, data: { label: "2 Route By Intent", description: "Enruta al crew según detected_intent (state). Si confianza baja → escalate_human.", detail: "Switch 8 ramas. Mapea intent→crew: product_search→search_and_recommend, price_comparison→compare_prices, checkout_support→checkout_guide, general_inquiry→general_support, abandoned_cart→recover_cart, return_request→handle_return, order_tracking→order_tracking, escalate→human. Log en ROUTE_BY_INTENT.", type: "condition", status: "idle", tools: [] } },
    // 6 crews base + 3 extra — cada uno con prompt, whitelist y modelo aislado
    { id: "crew-checkout", type: "base", position: { x: 0, y: 280 }, data: { label: "3 Checkout Guide", description: "Acompaña pago paso a paso: valida stock + precio con flete y cierra con checkout/processPurchase.", detail: "Tools: checkStock, calculatePricing, checkout, processPurchase, navigateTo, sendEmail. Valida antes de confirmar; si falla stock ofrece alternativas. Converge a Confirm Order.", type: "fulfill", status: "idle", agent: "StarShop Checkout Guide", tools: ["checkStock", "calculatePricing", "checkout", "processPurchase", "navigateTo"], intent: "checkout_support", model: "qwen/qwen3-30b-a3b" } },
    { id: "crew-compare", type: "base", position: { x: 150, y: 280 }, data: { label: "3 Compare Prices Crew", description: "Compara precio StarShop vs externo scrapeando URLs (Jina) y presenta tabla.", detail: "2 agents/2 tasks. Tools: searchProducts (precio base), scrapeWebsite (Jina Reader), calculatePricing. Si no puede scrapear, muestra precio StarShop y explica.", type: "agent_decision", status: "idle", agent: "StarShop Price Analyst", tools: ["searchProducts", "scrapeWebsite", "calculatePricing"], intent: "price_comparison", model: "qwen/qwen3-30b-a3b" } },
    { id: "crew-support", type: "base", position: { x: 300, y: 280 }, data: { label: "3 General Support", description: "Responde políticas, envíos, garantías; scrapea starshop.cl/politicas si falta info.", detail: "Tools: scrapeWebsite, navigateTo. Nunca inventa políticas; si no encuentra, escala a ventas@starshop.cl.", type: "agent_decision", status: "idle", agent: "StarShop Support Agent", tools: ["scrapeWebsite"], intent: "general_inquiry", model: "qwen/qwen3-30b-a3b" } },
    { id: "crew-search", type: "base", position: { x: 450, y: 280 }, data: { label: "3 Search And Recommend", description: "Busca en catálogo híbrido, valida stock/precio y recomienda con /busqueda.", detail: "Flow principal B2B. Tools: searchProducts (siempre primero), checkStock, calculatePricing, navigateTo (/busqueda?q=), scrapeWebsite. Anti-alucinación: usa categorySuggestions si noResults.", type: "agent_decision", status: "idle", agent: "StarShop Product Specialist", tools: ["searchProducts", "checkStock", "calculatePricing", "navigateTo"], intent: "product_search", model: "qwen/qwen3-30b-a3b" } },
    { id: "crew-return", type: "base", position: { x: 600, y: 280 }, data: { label: "3 Handle Return Request", description: "Evalúa devolución contra política (scrape) y envía email con pasos.", detail: "2 agents/2 tasks. Tools: scrapeWebsite (política), sendEmail (return_update), searchProducts (SKU), orderTracking. Aprueba solo dentro de plazo/estado.", type: "cancel", status: "idle", agent: "Returns Policy Evaluator", tools: ["scrapeWebsite", "sendEmail", "orderTracking"], intent: "return_request", model: "qwen/qwen3-30b-a3b" } },
    { id: "crew-cart", type: "base", position: { x: 750, y: 280 }, data: { label: "3 Recover Abandoned Cart", description: "Envía email persuasivo de carrito abandonado y ofrece ayuda para cerrar.", detail: "Tools: sendEmail (abandoned_cart), searchProducts, calculatePricing. Un email por carrito; si responde, enruta a checkout_guide.", type: "webhook", status: "idle", agent: "Cart Recovery Specialist", tools: ["sendEmail", "calculatePricing"], intent: "abandoned_cart", model: "qwen/qwen3-30b-a3b" } },
    { id: "crew-tracking", type: "base", position: { x: 150, y: 400 }, data: { label: "3 Order Tracking (WISMO)", description: "Informa estado pedido: Order.status + WorkflowRun.currentStep + StepLogs.", detail: "Tools: orderTracking (lee Order/WorkflowRun/StepLog), sendEmail (notificación), scrapeWebsite (política envíos). Pide orderId/email si falta.", type: "webhook", status: "idle", agent: "Order Tracker", tools: ["orderTracking", "sendEmail"], intent: "order_tracking", model: "qwen/qwen3-30b-a3b" } },
    { id: "crew-validate", type: "base", position: { x: 450, y: 400 }, data: { label: "3 Validate Stock & Pricing", description: "Nodo transversal: valida stock y calcula total con despacho por región.", detail: "Invocado por Search y Checkout. Tools: checkStock (SKU exacto), calculatePricing (sku, qty, región). Evita alucinar stock/precio. Usa tier pricing (5/10 uds).", type: "reserve_stock", status: "idle", tools: ["checkStock", "calculatePricing"], intent: "product_search/checkout" } },
    { id: "crew-escalate", type: "base", position: { x: 650, y: 400 }, data: { label: "3 Escalate To Human", description: "Deriva a ventas@starshop.cl cuando confianza baja o cliente pide humano.", detail: "Tools: sendEmail (general). Notifica al equipo y ofrece dejar mensaje/horario. No inventa respuestas.", type: "cancel", status: "idle", agent: "Human Handoff", tools: ["sendEmail"], intent: "escalate_human", model: "qwen/qwen3-30b-a3b" } },
    { id: "confirm-1", type: "base", position: { x: 350, y: 540 }, data: { label: "4 Confirm Order", description: "Registra pedido completado y envía email confirmación con resumen.", detail: "Solo si hay orderId. Tools: sendEmail (order_confirmation) + logStep CONFIRM_ORDER. Cierra flujo y dispara fulfillment.", type: "fulfill", status: "idle", tools: ["sendEmail"] } },
  ],
  edges: [
    { id: "e-welcome-route", source: "welcome-1", target: "route-1" },
    { id: "e-route-checkout", source: "route-1", target: "crew-checkout", label: "checkout_support" },
    { id: "e-route-compare", source: "route-1", target: "crew-compare", label: "price_comparison" },
    { id: "e-route-support", source: "route-1", target: "crew-support", label: "general_inquiry" },
    { id: "e-route-search", source: "route-1", target: "crew-search", label: "product_search" },
    { id: "e-route-return", source: "route-1", target: "crew-return", label: "return_request" },
    { id: "e-route-cart", source: "route-1", target: "crew-cart", label: "abandoned_cart" },
    { id: "e-route-tracking", source: "route-1", target: "crew-tracking", label: "order_tracking" },
    { id: "e-route-escalate", source: "route-1", target: "crew-escalate", label: "escalate_human" },
    // Validate es transversal (no ruteado, se invoca desde search/checkout)
    { id: "e-search-validate", source: "crew-search", target: "crew-validate" },
    { id: "e-checkout-validate", source: "crew-checkout", target: "crew-validate" },
    // Todos convergen a Confirm Order (si hay orderId)
    { id: "e-checkout-confirm", source: "crew-checkout", target: "confirm-1" },
    { id: "e-search-confirm", source: "crew-search", target: "confirm-1" },
    { id: "e-cart-confirm", source: "crew-cart", target: "confirm-1" },
  ],
};

export const starShopRouterSteps = [
  "DETECT_INTENT",
  "ROUTE_BY_INTENT",
  "CHECKOUT_GUIDE",
  "COMPARE_PRICES",
  "GENERAL_SUPPORT",
  "SEARCH_AND_RECOMMEND",
  "HANDLE_RETURN",
  "RECOVER_CART",
  "ORDER_TRACKING",
  "VALIDATE_STOCK_PRICING",
  "ESCALATE_HUMAN",
  "CONFIRM_ORDER",
];
