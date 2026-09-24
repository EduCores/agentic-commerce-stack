/**
 * Guards de texto de la respuesta final del agente (StarShop / ACS).
 *
 * Problema real (observado en prod): los modelos de la cadena gratis (Nemotron
 * vía OpenRouter) a veces intentan llamar una herramienta escribiendo su JSON
 * como TEXTO en vez de emitir una tool call nativa:
 *
 *   {"tool": "scrapeWebsite", "args": {"url": "https://starshop.cl/politicas"}}
 *
 * Ese bloque no es una respuesta válida para el cliente. `stripToolCallText`
 * lo elimina del texto final y `createToolCallTextFilter` lo retiene durante
 * el streaming para que el usuario no vea ni un fragmento. Si al limpiar no
 * queda nada, el agente usa su respuesta conversacional de respaldo
 * (directChat) — ver runAgent/streamAgent en agent/index.ts.
 */

/** Claves que delatan el nombre de la herramienta en un pseudo tool-call. */
const TOOL_NAME_KEYS = ["tool", "tool_name", "toolName", "name", "action"] as const;
/** Claves de argumentos: sin una de estas, un JSON con "name" es texto normal. */
const TOOL_ARG_KEYS = ["args", "arguments", "parameters", "input"] as const;

function isToolCallObject(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const rec = value as Record<string, unknown>;
  // Formato OpenAI: { function: { name, arguments } }
  const fn = rec.function;
  if (fn && typeof fn === "object" && !Array.isArray(fn) && typeof (fn as Record<string, unknown>).name === "string") return true;
  const hasName = TOOL_NAME_KEYS.some((k) => typeof rec[k] === "string" && (rec[k] as string).trim().length > 0);
  if (!hasName) return false;
  if (TOOL_ARG_KEYS.some((k) => rec[k] !== undefined)) return true;
  return rec.type === "tool_call" || rec.type === "function_call";
}

/** ¿Este JSON (ya parseado) tiene forma de llamada a herramienta? (interno) */
function looksLikeToolCallJson(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0 && value.every(isToolCallObject);
  if (!value || typeof value !== "object") return false;
  const rec = value as Record<string, unknown>;
  if (Array.isArray(rec.tool_calls)) return true; // { tool_calls: [...] }
  return isToolCallObject(value);
}

/**
 * Índice (exclusivo) donde termina el JSON balanceado que empieza en `from`,
 * o -1 si el texto acaba antes de cerrarlo. Respeta strings y escapes para no
 * contar llaves/corchetes dentro de comillas.
 */
function jsonSpanEnd(text: string, from = 0): number {
  const open = text[from];
  if (open !== "{" && open !== "[") return -1;
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = from; i < text.length; i += 1) {
    const c = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === open) depth += 1;
    else if (c === close) {
      depth -= 1;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

/** Spans JSON balanceados ({…} o […]) presentes en el texto. */
function findJsonSpans(text: string): Array<{ start: number; end: number }> {
  const spans: Array<{ start: number; end: number }> = [];
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (c !== "{" && c !== "[") continue;
    const end = jsonSpanEnd(text, i);
    if (end === -1) continue;
    spans.push({ start: i, end });
    i = end - 1;
  }
  return spans;
}

/** Pseudo tool-call TRUNCADO (sin cierre, p.ej. cortado por maxOutputTokens). */
const TRUNCATED_JUNK = /\s*[\[{][^{}]*(?:"tool"|"tool_name"|"toolName"|"function"|"action"|"name")\s*:\s*"[^"]*"[\s\S]*$/i;

/** Marcadores de fence huérfanos que quedan tras quitar un bloque ```json (solo al final del texto). */
const ORPHAN_FENCE = /```[a-z]*\s*(?:```)?\s*$/i;

/**
 * Elimina del texto las pseudo-llamadas de herramientas escritas como JSON
 * ({"tool": …}, {"name": …, "arguments": …}, <tool_call>…, ```json …```).
 * Si tras limpiar no queda contenido real, devuelve "".
 */
export function stripToolCallText(text: string): string {
  if (!text) return "";
  let out = text;

  // <tool_call>…</tool_call> (completo, luego sin cierre, luego sueltos)
  out = out.replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, " ");
  out = out.replace(/<tool_call>[\s\S]*$/i, " ");
  out = out.replace(/<\/?tool_call>/gi, " ");

  // Bloques ```json cuyo contenido es un pseudo tool-call completo
  out = out.replace(/```(?:json)?\s*([\s\S]*?)```/gi, (full: string, inner: string) => {
    try {
      return looksLikeToolCallJson(JSON.parse(inner.trim())) ? " " : full;
    } catch {
      return full;
    }
  });

  // JSON suelto con forma de tool-call (puede haber varios en la misma frase)
  let changed = true;
  while (changed) {
    changed = false;
    for (const span of findJsonSpans(out)) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(out.slice(span.start, span.end));
      } catch {
        continue;
      }
      if (!looksLikeToolCallJson(parsed)) continue;
      out = out.slice(0, span.start) + " " + out.slice(span.end);
      changed = true;
      break;
    }
  }

  // Red de seguridad: pseudo tool-call truncado (sin llave de cierre)
  out = out.replace(TRUNCATED_JUNK, " ");
  out = out.replace(ORPHAN_FENCE, " ");

  // Colapsa el hueco que dejaron los bloques eliminados
  out = out.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();

  // Si solo quedaron restos de puntuación/formato, la respuesta no tiene contenido
  const meaningful = out.replace(/[\s`~*_#>()[\]{}.,;:!?|"'\-]+/g, "");
  if (!meaningful) return "";
  return out;
}

/**
 * Cabeceras con las que puede empezar un pseudo tool-call escrito como texto.
 * El filtro de streaming solo retiene mientras el texto pendiente es prefijo
 * de una de estas cabeceras (así los fragmentos parciales se esperan completos).
 */
const PSEUDO_CALL_HEADS = [
  '{"tool"',
  '{"tool_name"',
  '{"toolName"',
  '{"tool_call"',
  '{"tool_calls"',
  '{"name"',
  '{"function"',
  '{"action"',
  '[{"tool"',
  '[{"name"',
  '[{"function"',
  "<tool_call>",
  "```json",
  "```JSON",
] as const;
const MAX_HEAD = Math.max(...PSEUDO_CALL_HEADS.map((h) => h.length));

type SuppressKind = "xml" | "fence" | "json";

function headKind(head: string): SuppressKind {
  if (head.toLowerCase().startsWith("<tool_call")) return "xml";
  if (head.startsWith("```")) return "fence";
  return "json";
}

/** ¿`s` es prefijo parcial (aún incompleto) de alguna cabecera? */
function isHeadPrefix(s: string): boolean {
  return s.length > 0 && PSEUDO_CALL_HEADS.some((h) => h.length > s.length && h.startsWith(s));
}

/** Índice de la primera cabecera completa dentro de `s` (-1 si no hay). */
function findHeadIndex(s: string): number {
  let best = -1;
  for (const h of PSEUDO_CALL_HEADS) {
    const idx = s.indexOf(h);
    if (idx !== -1 && (best === -1 || idx < best)) best = idx;
  }
  return best;
}

/** Cabecera completa que empieza exactamente en `idx`. */
function findHeadAt(s: string, idx: number): string {
  return PSEUDO_CALL_HEADS.find((h) => s.startsWith(h, idx)) as string;
}

/** Cola más larga del buffer que todavía podría ser el inicio de una cabecera. */
function ambiguousTail(held: string): string {
  const max = Math.min(held.length, MAX_HEAD);
  for (let len = max; len >= 1; len -= 1) {
    const tail = held.slice(held.length - len);
    const probe = tail.replace(/^\s+/, "");
    if (probe && isHeadPrefix(probe)) return tail;
  }
  return "";
}

export type ToolCallTextFilter = {
  /** Devuelve el texto que SÍ debe emitirse (puede ser "", nunca trozos de pseudo tool-call). */
  push(chunk: string): string;
  /** Vacía el buffer al cerrar el stream (descarta un pseudo tool-call incompleto). */
  flush(): string;
};

/**
 * Filtro incremental para el streaming: retiene el texto desde que detecta el
 * inicio de un pseudo tool-call hasta cerrarlo, y luego lo descarta. Si el
 * bloque retenido resulta ser texto legítimo (JSON sin forma de tool-call),
 * lo emite tal cual. La retención máxima de texto normal es MAX_HEAD-1 chars,
 * así que no se nota en el efecto tipeo.
 */
export function createToolCallTextFilter(): ToolCallTextFilter {
  let held = "";
  let suppress: SuppressKind | null = null;

  /** Qué consumir del bloque retenido; `null` = aún incompleto (seguir esperando). */
  function suppressLength(kind: SuppressKind, final: boolean): { len: number; junk: boolean } | null {
    if (kind === "xml") {
      const end = held.toLowerCase().indexOf("</tool_call>");
      if (end !== -1) return { len: end + "</tool_call>".length, junk: true };
      return final ? { len: held.length, junk: true } : null;
    }
    if (kind === "fence") {
      const end = held.indexOf("```", 3);
      if (end !== -1) {
        const inner = held.slice(3, end).replace(/^(json|JSON)\s*/, "").trim();
        let junk = true;
        try {
          junk = looksLikeToolCallJson(JSON.parse(inner));
        } catch {
          junk = false;
        }
        return { len: end + 3, junk };
      }
      return final ? { len: held.length, junk: true } : null;
    }
    // json
    const end = jsonSpanEnd(held, 0);
    if (end !== -1) {
      let junk = true;
      try {
        junk = looksLikeToolCallJson(JSON.parse(held.slice(0, end)));
      } catch {
        junk = false;
      }
      return { len: end, junk };
    }
    if (!final) return null;
    return { len: held.length, junk: /"(tool|tool_name|toolName|function|action|name)"\s*:/.test(held) };
  }

  function drain(final: boolean): string {
    let out = "";
    for (;;) {
      if (held === "") break;

      if (suppress) {
        const res = suppressLength(suppress, final);
        if (!res) break; // seguir esperando el cierre del bloque
        if (!res.junk) out += held.slice(0, res.len); // era texto legítimo: se emite
        held = held.slice(res.len).replace(/^[ \t]*\r?\n+/, "");
        suppress = null;
        continue;
      }

      if (final) {
        out += held;
        held = "";
        break;
      }

      const trimmed = held.replace(/^\s+/, "");
      // Cabecera completa en cualquier punto del buffer (puede venir precedida
      // de prosa cuando el chunk trae varias frases juntas): se emite la prosa
      // previa y se entra en modo supresión desde la cabecera.
      const headIdx = findHeadIndex(trimmed);
      if (headIdx !== -1) {
        const offset = held.length - trimmed.length;
        if (headIdx > 0) out += held.slice(offset, offset + headIdx);
        held = trimmed.slice(headIdx);
        suppress = headKind(findHeadAt(trimmed, headIdx));
        continue;
      }
      if (isHeadPrefix(trimmed)) break; // cabecera aún incompleta: esperar más chunks

      // Emite lo seguro y retiene solo la cola que podría ser inicio de cabecera
      const keep = ambiguousTail(held);
      out += held.slice(0, held.length - keep.length);
      held = keep;
      break;
    }
    return out;
  }

  return {
    push(chunk: string): string {
      if (!chunk) return "";
      held += chunk;
      return drain(false);
    },
    flush(): string {
      const out = drain(true);
      held = "";
      suppress = null;
      return out;
    },
  };
}

/**
 * Dumps de razonamiento (chain-of-thought) que los modelos de la cadena a
 * veces escriben como respuesta final — sobre todo cuando se les pide
 * responder SIN herramientas (directChat): un arranque así jamás es una
 * respuesta válida para el cliente (viene en inglés y con estructura de
 * análisis interno). Se revisa solo el inicio del texto.
 */
const REASONING_DUMP_STARTS: RegExp[] = [
  /^here'?s (?:a|the|my) (?:thinking|thought|reasoning|plan|analysis)\b/i,
  /^thinking process\b/i,
  /^chain of thought\b/i,
  /^let me (?:think|analyze|reason|work)\b/i,
  /^i (?:need|should|will|must|'ll) (?:to )?(?:analyze|think|respond|answer|check|figure)\b/i,
  /^(?:okay|alright|ok)[,.]?\s+(?:the user|let me|so\b|i need)/i,
  /^(?:the )?user (?:says|asks|wants|is saying)\b/i,
  /^\d+\.\s*\*\*(?:analyze|identify|determine|understand|break down|figure)/i,
  /^\*\*(?:analyze user input|identify intent|thinking process|understand the user)/i,
];

/** ¿El texto es un dump de razonamiento del modelo en vez de una respuesta? */
export function looksLikeReasoningDump(text: string): boolean {
  const head = text.trimStart().slice(0, 300);
  if (!head) return false;
  return REASONING_DUMP_STARTS.some((re) => re.test(head));
}

/**
 * Limpieza completa del texto del agente antes de mostrarlo al cliente:
 * pseudo tool-calls escritos como texto + dumps de razonamiento. "" significa
 * que el texto no tiene contenido usable (el llamador usa su respaldo).
 */
export function sanitizeReplyText(text: string): string {
  const cleaned = stripToolCallText(text);
  if (!cleaned) return "";
  return looksLikeReasoningDump(cleaned) ? "" : cleaned;
}

