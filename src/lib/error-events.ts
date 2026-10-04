/**
 * Mini-Sentry propio — captura y agrupación de errores (Fase observabilidad).
 *
 * POR QUÉ: sin Sentry, los errores de prod morían en console.log. Cada evento
 * se agrupa por `fingerprint` (mensaje normalizado: números, UUIDs, SKUs y
 * rutas se colapsan) → el mismo error 500 veces es 1 fila con count 500.
 * Nunca lanza: reportar no puede romper el flujo que reporta.
 */
import { prisma } from "@/lib/adapters/prisma";

export type ErrorKind = "verify-block" | "confirm-gate" | "client" | "api" | "agent" | "workflow";

export type ReportInput = {
  kind: ErrorKind;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
};

export type ReportResult = {
  fingerprint: string;
  count: number;
  isNew: boolean;
  spiked: boolean;
};

/** Umbral de spike: más de N ocurrencias en la última hora dispara alerta. */
export const ERROR_SPIKE_THRESHOLD = 10;

function normalizeForFingerprint(message: string): string {
  return message
    .toLowerCase()
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, "<id>")
    .replace(/\bcm[a-z0-9]{20,}\b/g, "<id>")
    .replace(/\b[A-Z0-9]{2,}(?:-[A-Z0-9]+)+\b/g, "<sku>")
    .replace(/\b\d[\d.,]*\b/g, "<n>")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

export function fingerprintFor(kind: string, message: string): string {
  return `${kind}:${normalizeForFingerprint(message)}`;
}

export async function reportError(input: ReportInput): Promise<ReportResult | null> {
  const fingerprint = fingerprintFor(input.kind, input.message);
  try {
    const existing = await prisma.errorEvent.findUnique({ where: { fingerprint } });
    if (existing) {
      const updated = await prisma.errorEvent.update({
        where: { fingerprint },
        data: { count: { increment: 1 }, lastSeenAt: new Date(), resolved: false, resolvedAt: null },
      });
      // Spike: cruzó el umbral en la última hora (ventana simple por count/hora
      // desde firstSeen; suficiente para alertar sin jobs extra).
      const hours = Math.max(1 / 60, (Date.now() - new Date(existing.firstSeenAt).getTime()) / 3_600_000);
      const spiked = updated.count / hours > ERROR_SPIKE_THRESHOLD;
      return { fingerprint, count: updated.count, isNew: false, spiked };
    }
    await prisma.errorEvent.create({
      data: {
        fingerprint,
        kind: input.kind,
        message: input.message.slice(0, 2000),
        stack: input.stack?.slice(0, 4000) ?? null,
        context: (input.context ?? {}) as object,
      },
    });
    return { fingerprint, count: 1, isNew: true, spiked: false };
  } catch {
    return null;
  }
}
