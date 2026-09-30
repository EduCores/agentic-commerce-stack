/**
 * Rate Limit Store — backend de contadores para el guard de chat.
 *
 * POR QUÉ EXISTE: en Vercel el runtime es serverless y el módulo se re-evalúa por
 * instancia lambda, así que un contador en memoria da un límite "30/min POR INSTANCIA":
 * con 4 instancias frías el agresor real obtiene ~120/min. Este módulo abstrae el
 * contador para poder usar Redis compartido SIN instalar dependencias: la API REST de
 * Upstash es HTTP puro (POST con pipeline + Bearer), así que basta `fetch` nativo.
 *
 * Ventana fija con la ventana dentro de la clave (`{key}:{win}`): así `INCR` es
 * suficiente para contar, el `EXPIRE` solo sirve para que Redis no acumule basura, y
 * el `retryAfter` se calcula en local (no hace falta leer el TTL).
 *
 * Configación vía env:
 *   UPSTASH_REDIS_REST_URL    +  UPSTASH_REDIS_REST_TOKEN  ⇒ backend distribuido
 *   (sin ambos, se usa memoria y el límite vuelve a ser por instancia)
 */

export interface RateLimitStore {
  /** Nombre del backend activo ("upstash" | "memory"); para diagnóstico/logs. */
  readonly name: "upstash" | "memory";
  /** Suma 1 al contador de `key` en la ventana actual de `windowMs`. */
  increment(key: string, windowMs: number): Promise<{ count: number; windowEndsAt: number }>;
}

const REDIS_TIMEOUT_MS = 800;
/** Circuit breaker: tras un fallo de Redis no se le martiriza durante este rato. */
const REDIS_COOLDOWN_MS = 30_000;

function windowStart(windowMs: number): number {
  return Math.floor(Date.now() / windowMs) * windowMs;
}

// ─── Backend en memoria (fallback / desarrollo) ───────────────────────────────────────
const local = new Map<string, number>();

const memoryStore: RateLimitStore = {
  name: "memory",
  async increment(key, windowMs) {
    const start = windowStart(windowMs);
    const count = (local.get(`${key}:${start}`) ?? 0) + 1;
    // Poda: solo interesan las ventanas viva y anterior.
    if (local.size > 5000) {
      const cutoff = start - windowMs;
      for (const k of local.keys()) if (Number(k.split(":").pop()) < cutoff) local.delete(k);
    }
    return { count, windowEndsAt: start + windowMs };
  },
};

// ─── Backend distribuido (Upstash REST, sin SDK) ──────────────────────────────────────
type UpstashConfig = { url: string; token: string };

export function getUpstashConfig(): UpstashConfig | null {
  const raw = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!raw || !token) return null;
  const url = raw.startsWith("http") ? raw : `https://${raw}`;
  return { url: url.replace(/\/+$/, ""), token };
}

let redisDownUntil = 0;
let warned = false;

function upstashStore(cfg: UpstashConfig): RateLimitStore {
  return {
    name: "upstash",
    async increment(key, windowMs) {
      const start = windowStart(windowMs);
      const redisKey = `${key}:${start}`;
      // Pipeline: INCR (cuenta) + EXPIRE (GC, con margen de 2 ventanas).
      const res = await fetch(cfg.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
        body: JSON.stringify([["INCR", redisKey], ["EXPIRE", redisKey, Math.ceil((windowMs * 2) / 1000)]]),
        signal: AbortSignal.timeout(REDIS_TIMEOUT_MS),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Redis REST ${res.status}`);
      const data: unknown = await res.json();
      const first = Array.isArray(data) ? data[0] : data;
      const count = Number(first);
      if (!Number.isFinite(count) || count < 1) throw new Error("respuesta inesperada de Redis");
      return { count, windowEndsAt: start + windowMs };
    },
  };
}

/** Backend activo. Se resuelve en cada llamada para respetar cambios de env/hot-reload. */
export function getRateLimitStore(): RateLimitStore {
  const cfg = getUpstashConfig();
  if (!cfg) return memoryStore;
  if (Date.now() < redisDownUntil) return memoryStore; // circuit breaker abierto
  return upstashStore(cfg);
}

/** Tras un fallo de Redis: degrada a memoria un rato y avisa una sola vez. */
export function reportStoreFailure(err: unknown): void {
  redisDownUntil = Date.now() + REDIS_COOLDOWN_MS;
  if (!warned) {
    warned = true;
    console.warn(
      `[chat-guard] Redis no disponible, el rate-limit degrada a memoria (por instancia): ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}

/** true si Redis está configurado (no si está sano). */
export function isDistributedLimiterEnabled(): boolean {
  return getUpstashConfig() !== null;
}

/** Nombre del backend que responderá a la próxima petición. */
export function activeStoreName(): RateLimitStore["name"] {
  return getRateLimitStore().name;
}
