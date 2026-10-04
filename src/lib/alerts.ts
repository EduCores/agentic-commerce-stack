/**
 * Alertas al dueño por email (Plan B sin Sentry).
 *
 * POR QUÉ: los errores graves en producción deben llegar a alguien aunque no
 * haya observabilidad externa. Usa el email-agent existente (Resend/mock) con
 * cooldown de 1 hora por clave para no spamear. Nunca lanza: una alerta que
 * rompe el flujo sería peor que el silencio.
 */
import { prisma } from "@/lib/adapters/prisma";

const COOLDOWN_MS = 60 * 60 * 1000;
const lastSent = new Map<string, number>();

export async function alertOwner(key: string, subject: string, text: string): Promise<void> {
  try {
    const now = Date.now();
    if (now - (lastSent.get(key) ?? 0) < COOLDOWN_MS) return;
    lastSent.set(key, now);
    // Owner primero; si aún no existe ese rol, cae al primer admin.
    // (Hoy no hay owner en la DB: solo admins. Sin este fallback las
    // alertas se perderían en silencio.)
    const owner = await prisma.adminUser
      .findFirst({ where: { role: "owner" }, select: { email: true } })
      .catch(() => null);
    const admin = owner?.email
      ? null
      : await prisma.adminUser
          .findFirst({ where: { role: "admin" }, orderBy: { createdAt: "asc" }, select: { email: true } })
          .catch(() => null);
    const to = owner?.email ?? admin?.email;
    if (!to) return;
    const { dispatchEmailEvent } = await import("@/workflows/email-agent");
    await dispatchEmailEvent({ trigger: "general", to, subject: `[ACS alerta] ${subject}`, text });
  } catch {
    // Las alertas nunca rompen el flujo que las origina.
  }
}
