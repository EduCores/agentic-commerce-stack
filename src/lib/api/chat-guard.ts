/**
 * ACS Chat Guard — protección de las rutas públicas /api/chat y /api/chat/stream.
 *
 * El widget del chat lo consume el frontend StarShop desde el navegador (CORS).
 * Para que nadie ajeno gaste créditos OpenRouter:
 *
 *   1. Allowlist de orígenes: toda petición con cabecera `Origin` que no esté en la
 *      lista permitida se rechaza con 403. Las peticiones SIN Origin (curl, Postman,
 *      server-to-server y el proxy interno route.ts → stream/route.ts) se permiten;
 *      su defensa es el rate-limit.
 *   2. Rate-limit por IP: ventana fija en memoria (mapa de buckets). En Vercel el
 *      runtime es serverless: el límite es best-effort por instancia lambda. Para un
 *      endurecimiento multi-instancia real, migrar el store a Upstash/Redis o BD.
 *
 * Configuración vía env:
 *   ALLOWED_ORIGINS          — orígenes extra separados por coma
 *   CHAT_RATE_LIMIT_PER_MIN  — máx peticiones por IP y minuto (default 30, 0 = ilimitado)
 */

const ORIGIN_HEADER = "Access-Control-Allow-Origin";

const DEFAULT_ALLOWED_ORIGINS = [
  "https://starshop-rho.vercel.app",
  "https://agentic-commerce-stack.vercel.app",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
];

function trimSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function getAllowedOrigins(): string[] {
  const extra = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  return [...new Set([...(appUrl ? [appUrl] : []), ...DEFAULT_ALLOWED_ORIGINS, ...extra])];
}

/** Origen permitido: igualdad exacta (sin trailing slash). Sin Origin ⇒ permitido. */
export function isOriginAllowed(origin: string | null | undefined): boolean {
  if (!origin) return true;
  const o = trimSlash(origin);
  return getAllowedOrigins().some((a) => trimSlash(a) === o);
}

/** Headers CORS: refleja el origen SOLO si está permitido (evita CORS abierto `*`). */
export function corsHeaders(origin: string | null | undefined): Record<string, string> {
  const allowed = origin && isOriginAllowed(origin) ? trimSlash(origin) : process.env.NEXT_PUBLIC_APP_URL ?? "https://agentic-commerce-stack.vercel.app";
  return {
    [ORIGIN_HEADER]: allowed,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

// ─── Rate limiter (ventana fija en memoria, best-effort multi-instancia) ─────────────
const WINDOW_MS = 60_000;

function parsePositiveInt(v: string | undefined, fallback: number): number {
  const n = parseInt(v ?? "", 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

const MAX_PER_MIN = parsePositiveInt(process.env.CHAT_RATE_LIMIT_PER_MIN, 30);

interface Bucket {
  count: number;
  resetAt: number;
}
const buckets = new Map<string, Bucket>();

function pruneBuckets(now: number) {
  if (buckets.size < 10_000) return;
  for (const [k, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(k);
  }
}

/** IP cliente: Vercel expone la real vía x-forwarded-for. */
export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0].trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSec: number };

export function checkRateLimit(ip: string, scope: string): RateLimitResult {
  if (MAX_PER_MIN <= 0) return { allowed: true };
  const now = Date.now();
  pruneBuckets(now);
  const id = `${scope}:${ip}`;
  const b = buckets.get(id);
  if (!b || b.resetAt <= now) {
    buckets.set(id, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }
  b.count += 1;
  if (b.count > MAX_PER_MIN) {
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }
  return { allowed: true };
}

export type GuardResult =
  | { allowed: true; headers: Record<string, string> }
  | { allowed: false; status: number; error: string; retryAfter?: number; headers: Record<string, string> };

/**
 * Valida origin + rate-limit en una petición de chat.
 * El marcador `x-acs-internal-proxy: 1` indica que la petición vino del proxy interno
 * de route.ts (ya validada), evitando el doble conteo del rate limit.
 */
export function guardChatRequest(req: Request, scope: string): GuardResult {
  const origin = req.headers.get("origin");
  if (!isOriginAllowed(origin)) {
    return { allowed: false, status: 403, error: "Origen no permitido", headers: corsHeaders(origin) };
  }
  const isInternal = req.headers.get("x-acs-internal-proxy") === "1";
  if (!isInternal) {
    const ip = getClientIp(req);
    const rl = checkRateLimit(ip, scope);
    if (!rl.allowed) {
      return { allowed: false, status: 429, error: "Demasiadas peticiones. Intenta en un momento.", retryAfter: rl.retryAfterSec, headers: corsHeaders(origin) };
    }
  }
  return { allowed: true, headers: corsHeaders(origin) };
}