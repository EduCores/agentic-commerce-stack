/**
 * StarShop Intent Router — ACS 1→2→6+3→4
 * Workflow durable que implementa el diagrama StarShop:
 * 1 Welcome And Detect Intent → 2 Route By Intent (state.detected_intent) → 3.x Crews (6 + 3 extra) → 4 Confirm Order
 * Persiste en WorkflowDefinition (graph XYFlow) y WorkflowRun/OrderStepLog para observabilidad.
 */
import { createWorkflow, createStep, logStep } from "@/lib/workflows/engine";
import { STARSHOP_CREW_TOOLS, STARSHOP_CREWS, type StarShopIntent } from "../../prisma/starshop-prompts";

// ── Steps ────────────────────────────────────────────────────────────────────

export const detectIntentStep = createStep<{ message: string; history?: unknown[] }, { intent: StarShopIntent; confidence: number }>(
  "detect-intent",
  async ({ message }) => {
    // LLM primero, heurística como fallback mock (sin DB ni key igual funciona)
    const { detectIntent } = await import("@/lib/eve/detect-intent");
    const detected = await detectIntent(message);
    await logStep({ stepName: "DETECT_INTENT", status: "COMPLETED", input: { message }, output: { intent: detected.intent, confidence: detected.confidence, source: detected.source } });
    return { intent: detected.intent, confidence: detected.confidence };
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
      admin_ops: "admin_ops",
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
    { id: "welcome-1", type: "base", position: { x: 350, y: 20 }, data: { label: "1 Bienvenida y detección de intento", description: "Saluda cálido y detecta la intención (9 intents) sin llamar herramientas. Guarda state.detected_intent.", detail: "Entrada del flujo. Clasifica: product_search, price_comparison, checkout_support, general_inquiry, abandoned_cart, return_request, order_tracking, escalate_human, admin_ops. Si el saludo es vago, califica con 2 preguntas.", type: "trigger", status: "idle", agent: "StarShop Welcome Agent", tools: [] } },
    { id: "route-1", type: "base", position: { x: 350, y: 140 }, data: { label: "2 Enrutar por intento", description: "Enruta al crew según detected_intent (state). Si la confianza es baja → escalate_human.", detail: "Switch 9 ramas. Mapea intent→crew: product_search→search_and_recommend, price_comparison→compare_prices, checkout_support→checkout_guide, general_inquiry→general_support, abandoned_cart→recover_cart, return_request→handle_return, order_tracking→order_tracking, escalate→human, admin_ops→admin_ops. Log en ROUTE_BY_INTENT.", type: "condition", status: "idle", tools: [] } },
    // 6 crews base + 3 extra — cada uno con prompt, whitelist y modelo aislado
    { id: "crew-checkout", type: "base", position: { x: 0, y: 280 }, data: { label: "3 Guía de compra", description: "Acompaña el pago paso a paso: valida stock + precio con flete y cierra con checkout/processPurchase.", detail: "Tools: checkStock, calculatePricing, checkout, processPurchase, navigateTo, sendEmail. Valida antes de confirmar; si falla el stock ofrece alternativas. Converge a Confirm Order.", type: "fulfill", status: "idle", agent: "StarShop Checkout Guide", tools: STARSHOP_CREW_TOOLS.checkout_support, prompt: STARSHOP_CREWS.checkout_guide.prompt, intent: "checkout_support", model: STARSHOP_CREWS.checkout_guide.model } },
    { id: "crew-compare", type: "base", position: { x: 150, y: 280 }, data: { label: "3 Comparador de precios", description: "Compara el precio StarShop vs. externo scrapeando URLs (Jina) y presenta una tabla.", detail: "2 agents/2 tasks. Tools: searchProducts (precio base), scrapeWebsite (Jina Reader), calculatePricing. Si no puede scrapear, muestra el precio StarShop y lo explica.", type: "agent_decision", status: "idle", agent: "StarShop Price Analyst", tools: STARSHOP_CREW_TOOLS.price_comparison, prompt: STARSHOP_CREWS.compare_prices.prompt, intent: "price_comparison", model: STARSHOP_CREWS.compare_prices.model } },
    { id: "crew-support", type: "base", position: { x: 300, y: 280 }, data: { label: "3 Soporte general", description: "Responde políticas, envíos y garantías; scrapea starshop.cl/politicas si falta información.", detail: "Tools: scrapeWebsite, navigateTo. Nunca inventa políticas; si no encuentra, escala a ventas@starshop.cl.", type: "agent_decision", status: "idle", agent: "StarShop Support Agent", tools: STARSHOP_CREW_TOOLS.general_inquiry, prompt: STARSHOP_CREWS.general_support.prompt, intent: "general_inquiry", model: STARSHOP_CREWS.general_support.model } },
    { id: "crew-search", type: "base", position: { x: 450, y: 280 }, data: { label: "3 Búsqueda y recomendación", description: "Busca en el catálogo híbrido, valida stock/precio y recomienda con /busqueda.", detail: "Flujo principal B2B. Tools: searchProducts (siempre primero), checkStock, calculatePricing, navigateTo (/busqueda?q=), scrapeWebsite. Anti-alucinación: usa categorySuggestions si noResults.", type: "agent_decision", status: "idle", agent: "StarShop Product Specialist", tools: STARSHOP_CREW_TOOLS.product_search, prompt: STARSHOP_CREWS.search_and_recommend.prompt, intent: "product_search", model: STARSHOP_CREWS.search_and_recommend.model } },
    { id: "crew-return", type: "base", position: { x: 600, y: 280 }, data: { label: "3 Gestión de devoluciones", description: "Evalúa la devolución contra la política (scrape) y envía email con los pasos.", detail: "2 agents/2 tasks. Tools: scrapeWebsite (política), sendEmail (return_update), searchProducts (SKU), orderTracking. Aprueba solo dentro de plazo/estado.", type: "cancel", status: "idle", agent: "Returns Policy Evaluator", tools: STARSHOP_CREW_TOOLS.return_request, prompt: STARSHOP_CREWS.handle_return.prompt, intent: "return_request", model: STARSHOP_CREWS.handle_return.model } },
    { id: "crew-cart", type: "base", position: { x: 750, y: 280 }, data: { label: "3 Recuperar carrito", description: "Envía un email persuasivo de carrito abandonado y ofrece ayuda para cerrar la compra.", detail: "Tools: sendEmail (abandoned_cart), searchProducts, calculatePricing. Un email por carrito; si responde, enruta a checkout_guide.", type: "webhook", status: "idle", agent: "Cart Recovery Specialist", tools: STARSHOP_CREW_TOOLS.abandoned_cart, prompt: STARSHOP_CREWS.recover_cart.prompt, intent: "abandoned_cart", model: STARSHOP_CREWS.recover_cart.model } },
    { id: "crew-tracking", type: "base", position: { x: 150, y: 400 }, data: { label: "3 Seguimiento de pedido (WISMO)", description: "Informa el estado del pedido: Order.status + WorkflowRun.currentStep + StepLogs.", detail: "Tools: orderTracking (lee Order/WorkflowRun/StepLog), sendEmail (notificación), scrapeWebsite (política envíos). Pide orderId/email si falta.", type: "webhook", status: "idle", agent: "Order Tracker", tools: STARSHOP_CREW_TOOLS.order_tracking, prompt: STARSHOP_CREWS.order_tracking.prompt, intent: "order_tracking", model: STARSHOP_CREWS.order_tracking.model } },
    { id: "crew-validate", type: "base", position: { x: 450, y: 400 }, data: { label: "3 Validar stock y precio", description: "Nodo transversal: valida el stock y calcula el total con despacho por región.", detail: "Invocado por Search y Checkout. Tools: checkStock (SKU exacto), calculatePricing (sku, qty, región). Evita alucinar stock/precio. Usa tier pricing (5/10 uds).", type: "reserve_stock", status: "idle", tools: ["checkStock", "calculatePricing"] } },
    { id: "crew-escalate", type: "base", position: { x: 650, y: 400 }, data: { label: "3 Derivar a humano", description: "Deriva a ventas@starshop.cl cuando la confianza es baja o el cliente pide un humano.", detail: "Tools: sendEmail (general). Notifica al equipo y ofrece dejar mensaje/horario. No inventa respuestas.", type: "cancel", status: "idle", agent: "Human Handoff", tools: STARSHOP_CREW_TOOLS.escalate_human, prompt: STARSHOP_CREWS.escalate_human.prompt, intent: "escalate_human", model: STARSHOP_CREWS.escalate_human.model } },
    { id: "crew-admin", type: "base", position: { x: 350, y: 400 }, data: { label: "3 Operaciones admin (Dueño)", description: "Asistente del dueño: métricas, stock bajo, pedidos con alerta, crear producto.", detail: "Mismo estilo StarShop. Tools: searchProducts, checkStock, orderTracking, scrapeWebsite, sendEmail. Responde con números reales y links /products /orders /workflows.", type: "agent_decision", status: "idle", agent: "StarShop Admin Ops", tools: STARSHOP_CREW_TOOLS.admin_ops, prompt: STARSHOP_CREWS.admin_ops.prompt, intent: "admin_ops", model: STARSHOP_CREWS.admin_ops.model } },
    { id: "confirm-1", type: "base", position: { x: 350, y: 540 }, data: { label: "4 Confirmar pedido", description: "Registra el pedido completado y envía el email de confirmación con resumen.", detail: "Solo si hay orderId. Tools: sendEmail (order_confirmation) + logStep CONFIRM_ORDER. Cierra el flujo y dispara el fulfillment.", type: "fulfill", status: "idle", tools: ["sendEmail"] } },
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
    { id: "e-route-admin", source: "route-1", target: "crew-admin", label: "admin_ops" },
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
  "ADMIN_OPS",
  "CONFIRM_ORDER",
];
