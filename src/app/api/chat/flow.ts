/**
 * Lógica pura del endpoint POST /api/chat (sin Next, sin BD, sin LLM).
 *
 * POR QUÉ EXISTE SEPARADA: el mapeo de tool calls y la inyección de navegación
 * son el cableado más crítico del agente (aquí se rompió el checkout: la tool
 * devolvía `checkoutUrl` y el widget la buscaba en `args`). Al vivir en un
 * módulo puro, `scripts/eval-agent-core.ts` los fija con casos sin servidor.
 */

export type MappedToolCall = {
  toolName: string;
  args: Record<string, unknown>;
  output: Record<string, unknown>;
};

/**
 * Normaliza los tool calls crudos del agente al contrato que lee el storefront:
 * { toolName, args, output }, con `path` y `checkoutUrl` copiados a `args`
 * cuando la tool los devuelve en `output`.
 */
export function mapAgentToolCalls(rawCalls: Array<Record<string, unknown>>): MappedToolCall[] {
  return rawCalls.map((tc) => {
    const toolName = ((tc.toolName ?? tc.name) as string | undefined) ?? "unknown";
    const input = (tc.input ?? tc.args ?? {}) as Record<string, unknown>;
    const output = (tc.output ?? {}) as Record<string, unknown>;
    const args: Record<string, unknown> = { ...input };
    if (typeof output.navigateTo === "string") args.path = output.navigateTo;
    // La tool checkout devuelve checkoutUrl (no navigateTo): el widget la lee
    // como chk.args.checkoutUrl. Sin este mapeo el checkout ordenado por el
    // agente nunca navegaba (era undefined en args/result).
    if (typeof output.checkoutUrl === "string") args.checkoutUrl = output.checkoutUrl;
    return { toolName, args, output };
  });
}

/** true si el call es una navegación real (no vacía ni bloqueada). */
export function isLiveNavigation(tc: MappedToolCall): boolean {
  if (tc.toolName !== "navigateTo") return false;
  const dest = tc.output?.navigateTo;
  return typeof dest === "string" && dest !== "" && !(tc.output as Record<string, unknown>).blocked;
}

/**
 * Inyección de navegación: si el LLM llamó searchProducts pero NO navigateTo,
 * agrega /busqueda?q= para garantizar la experiencia. NO inyecta cuando:
 * - ya hay una navegación real (válida), incluida la bloqueada que NO cuenta;
 * - la tool marcó notAProductQuery (charla) o noResults (cero matches): abrir
 *   /busqueda?q= vacío contradice la regla 6b (mostrar opciones y preguntar).
 * Con resultados débiles (uncertain) SÍ se inyecta: la ventana de resultados
 * es el lugar donde el cliente ve las opciones.
 */
export function injectSearchNavigation(toolCalls: MappedToolCall[]): { toolCalls: MappedToolCall[]; autoQuery: string } {
  const out = [...toolCalls];
  const hasNavigate = out.some(isLiveNavigation);
  const searchCall = out.find((tc) => tc.toolName === "searchProducts");
  let autoQuery = "";
  if (!hasNavigate && searchCall) {
    const searchOut = (searchCall.output ?? {}) as Record<string, unknown>;
    const cleanFromTool = typeof searchOut.cleanQuery === "string" ? searchOut.cleanQuery.trim() : "";
    const rawArg = ((searchCall.args?.query as string) ?? "").trim();
    const query = cleanFromTool || (searchOut.notAProductQuery === true ? "" : rawArg);
    const hasResults = searchOut.noResults !== true && (typeof searchOut.found === "number" ? searchOut.found > 0 : true);
    if (query && hasResults) {
      autoQuery = query;
      out.push({
        toolName: "navigateTo",
        args: { path: "/busqueda", query, fromAutoInject: true },
        output: { navigateTo: `/busqueda?q=${encodeURIComponent(query)}` },
      });
    }
  }
  return { toolCalls: out, autoQuery };
}
