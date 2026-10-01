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
 *   2. Rate-limit por IP: ventana fija de 60 s. El contador vive en
 *      `./rate-limit-store`: con `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
 *      se cuenta en Redis compartido (válido entre TODAS las instancias lambda, que es
 *      el límite de verdad); sin esas variables cae a memoria —best-effort por
 *      instancia— y, si Redis falla, degrada a memoria con circuit breaker de 30 s.
 *      Se usa la API REST de Upstash por `fetch`: cero dependencias nuevas.
 *   3. Proxy interno FIRMADO: cuando route.ts reenvía a /api/chat/stream no puede
 *      contar dos veces el mismo mensaje, así que salta su propio conteo y le pasa
 *      la IP del cliente en `x-acs-proxy-ip` + firma HMAC-SHA256 (`x-acs-proxy-sig`,
 *      sellada con getJwtSecret()). Sin firma válida esas cabeceras se ignoran y la
 *      petición se cuenta con la IP de quien llama: nadie puede inventarse un bypass.
 *   4. Binding tenant por Origin (`resolveTenantStore`): el `storeId` lo manda el
 *      cliente y no es confiable. Si el Origin coincide con el `domain` de una
 *      StoreConnection, se impone ese storeId (el solicitado se ignora y se
 *      loguea). Sin Origin mapeado (dashboard propio, proxy interno, dev) se
 *      respeta el solicitado. Así un tenant nunca vitrina el catálogo de otro.
 *
 * Configuración vía env:
 *   ALLOWED_ORIGINS          — orígenes extra separados por coma
 *   CHAT_RATE_LIMIT_PER_MIN  — máx peticiones por IP y minuto (default 30, 0 = ilimitado)
 *   UPSTASH_REDIS_REST_URL   — host REST de Upstash (ej: https://x.upstash.io)
 *   UPSTASH_REDIS_REST_TOKEN — token Bearer de ese host ⇒ rate-limit distribuido
 *                              (sin ambas variables el contador cae a memoria, por instancia)
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { getJwtSecret } from "@/lib/jwt-secret";
import { getRateLimitStore, reportStoreFailure } from "./rate-limit-store";


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

// El contador vive en ./rate-limit-store (memoria o Redis según env) para que el
// límite no dependa de cuántas instancias lambda hayan entrado frías.

/**
 * IP cliente. En Vercel el borde añade la IP real a `x-forwarded-for`: la entrada
 * FIABLE es la ÚLTIMA (la que agrega el proxy más cercano). Leer la primera permitía
 * al cliente inventarse una IP distinta en cada intento y saltarse el rate-limit.
 * Nota: desplegado SIN proxy delante, `x-forwarded-for` es 100% del cliente; en ese
 * caso hay que limitar por otra vía (p. ej. el borde/CDN).
 */
export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const parts = fwd.split(",").map((p) => p.trim()).filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) return last;
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

// ─── Proxy interno firmado (route.ts → stream/route.ts) ──────────────────────────────
export const PROXY_IP_HEADER = "x-acs-proxy-ip";
export const PROXY_SIG_HEADER = "x-acs-proxy-sig";

function signProxyIp(ip: string): string {
  return createHmac("sha256", getJwtSecret()).update(`acs-chat-proxy:${ip}`).digest("hex");
}

/** Cabeceras que route.ts añade al reenviar la petición al mismo proyecto. */
export function internalProxyHeaders(clientIp: string): Record<string, string> {
  return { [PROXY_IP_HEADER]: clientIp, [PROXY_SIG_HEADER]: signProxyIp(clientIp) };
}

/**
 * IP declarada por el proxy interno, SOLO si la firma HMAC es válida.
 * Un cliente externo no puede calcularla (no conoce ADMIN_JWT_SECRET).
 */
export function verifiedProxyIp(req: Request): string | null {
  const ip = req.headers.get(PROXY_IP_HEADER);
  const sig = req.headers.get(PROXY_SIG_HEADER);
  if (!ip || !sig) return null;
  const expected = signProxyIp(ip);
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return ip;
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSec: number };

/**
 * Cuenta una petición contra el backend activo (Redis compartido si `UPSTASH_REDIS_REST_*`
 * están definidos; si no, memoria). Nunca lanza: si el backend distribuido falla se
 * degrada a memoria y se abre un circuit breaker de 30 s para no martillearlo.
 */
export async function checkRateLimit(ip: string, scope: string): Promise<RateLimitResult> {
  if (MAX_PER_MIN <= 0) return { allowed: true };
  const key = `acs:chat:${scope}:${ip}`;
  let res: { count: number; windowEndsAt: number };
  try {
    res = await getRateLimitStore().increment(key, WINDOW_MS);
  } catch (e) {
    reportStoreFailure(e);
    try {
      // Con el breaker abierto getRateLimitStore() ya devuelve el store de memoria.
      res = await getRateLimitStore().increment(key, WINDOW_MS);
    } catch {
      return { allowed: true }; // un limiter roto no puede tumbar el chat
    }
  }
  if (res.count > MAX_PER_MIN) {
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((res.windowEndsAt - Date.now()) / 1000)) };
  }
  return { allowed: true };
}

/** Backend de contadores en uso ("upstash" | "memory"); para diagnóstico y para la sonda. */
export function rateLimitBackend(): string {
  return getRateLimitStore().name;
}

export type GuardResult =
  | { allowed: true; headers: Record<string, string> }
  | { allowed: false; status: number; error: string; retryAfter?: number; headers: Record<string, string> };

export type GuardOptions = {
  /**
   * true solo cuando route.ts ya NO cuenta esta petición porque la va a reenviar a
   * /api/chat/stream (allí se cuenta una sola vez, con la IP firmada del cliente).
   */
  skipRateLimit?: boolean;
};

/**
 * Valida origin + rate-limit en una petición de chat.
 * La IP se toma de `x-acs-proxy-ip` solo si trae firma válida (proxy interno); en
 * cualquier otro caso se usa la IP real de quien llama — el marcador ya no se puede
 * falsificar para saltarse el límite.
 */
export async function guardChatRequest(req: Request, scope: string, opts?: GuardOptions): Promise<GuardResult> {
  const origin = req.headers.get("origin");
  if (!isOriginAllowed(origin)) {
    return { allowed: false, status: 403, error: "Origen no permitido", headers: corsHeaders(origin) };
  }
  if (!opts?.skipRateLimit) {
    const ip = verifiedProxyIp(req) ?? getClientIp(req);
    const rl = await checkRateLimit(ip, scope);
    if (!rl.allowed) {
      return { allowed: false, status: 429, error: "Demasiadas peticiones. Intenta en un momento.", retryAfter: rl.retryAfterSec, headers: corsHeaders(origin) };
    }
  }
  return { allowed: true, headers: corsHeaders(origin) };
}

export type TenantResolution = {
  storeId: string;
  overridden: boolean;
  tenantId: string | null;
};

/**
 * Resuelve el tenant autoritativo por Origin (Fase multi-tenant).
 *
 * POR QUÉ: el `storeId` del body lo elige el cliente (navegador) y un curioso
 * podría pedir el de otro tenant. Si el Origin coincide con el `domain` de una
 * StoreConnection, ese es el tenant dueño de la petición y se impone su id.
 * Sin Origin mapeado (dashboard ACS, proxy interno sin Origin, curl, dev) se
 * respeta el solicitado con default "seed-store". Nunca lanza (sin DB = fallback).
 */
export async function resolveTenantStore(
  origin: string | null | undefined,
  requestedStoreId?: string,
): Promise<TenantResolution> {
  const fallback = (requestedStoreId ?? "").trim() || "seed-store";
  const o = (origin ?? "").trim().replace(/\/+$/, "");
  if (!o) return { storeId: fallback, overridden: false, tenantId: null };
  try {
    const { prisma } = await import("@/lib/adapters/prisma");
    const match = await prisma.storeConnection.findFirst({
      where: { OR: [{ domain: o }, { domain: `${o}/` }] },
      select: { id: true },
    });
    if (!match) return { storeId: fallback, overridden: false, tenantId: null };
    return { storeId: match.id, overridden: match.id !== fallback, tenantId: match.id };
  } catch {
    return { storeId: fallback, overridden: false, tenantId: null };
  }
}