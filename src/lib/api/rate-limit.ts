/**
 * Rate limiter en memoria (ventana fija) para endpoints sensibles de auth.
 * Best-effort en serverless multi-instancia (cada lambda lleva su propio mapa),
 * igual que el guard del chat. Suficiente contra fuerza bruta casual y abuso simple.
 */
import { getClientIp } from "@/lib/api/chat-guard";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function prune(now: number) {
  if (buckets.size < 5000) return;
  for (const [k, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(k);
  }
}

export function checkAuthRateLimit(
  req: Request,
  scope: string,
  maxPerMin: number,
  extraKey = "",
): { allowed: true } | { allowed: false; retryAfterSec: number } {
  if (maxPerMin <= 0) return { allowed: true };
  const now = Date.now();
  prune(now);
  const id = `auth:${scope}:${getClientIp(req)}:${extraKey}`;
  const b = buckets.get(id);
  if (!b || b.resetAt <= now) {
    buckets.set(id, { count: 1, resetAt: now + 60_000 });
    return { allowed: true };
  }
  b.count += 1;
  if (b.count > maxPerMin) {
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }
  return { allowed: true };
}

export function rateLimitResponse(retryAfterSec: number) {
  return { status: 429 as const, headers: { "Retry-After": String(retryAfterSec) } };
}
