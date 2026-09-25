import { readFileSync } from "node:fs";

function loadEnv() {
  try {
    for (const raw of readFileSync(".env", "utf8").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch (e) {
    console.warn("No se pudo leer .env:", e instanceof Error ? e.message : e);
  }
}
loadEnv();

async function main() {
  const { prisma } = await import("../src/lib/adapters/prisma");
  const { dispatchEmailEvent } = await import("../src/workflows/email-agent");

  console.log("RESEND_API_KEY presente:", !!process.env.RESEND_API_KEY, "(esperado false = mock)");

  // 1) Evento de login 2FA
  const r1 = await dispatchEmailEvent({
    trigger: "2fa_code",
    to: "Cliente@Ejemplo.COM",
    subject: "Tu código StarShop",
    text: "Tu código de verificación (5 min): 123456",
    vars: { asunto: "Tu código StarShop", mensaje: "Tu código de verificación (5 min): 123456" },
  });
  console.log("2fa_code run:", JSON.stringify(r1));
  if (r1.status !== "COMPLETED") throw new Error("run 2fa_code NO completó: " + r1.status);

  // 2) Evento password_reset
  const r2 = await dispatchEmailEvent({
    trigger: "password_reset",
    to: "cliente@example.com",
    subject: "Recupera tu acceso StarShop",
    text: "Usa este código para restablecer (15 min): token-demo",
  });
  console.log("password_reset run:", JSON.stringify(r2));
  if (r2.status !== "COMPLETED") throw new Error("run password_reset NO completó: " + r2.status);

  // 3) Email inválido → el run debe FALLAR sin enviar
  const r3 = await dispatchEmailEvent({ trigger: "general", to: "no-es-email", subject: "x" });
  console.log("inválido run:", JSON.stringify(r3));
  if (r3.status !== "FAILED") throw new Error("run con email inválido debería FALLAR, salió: " + r3.status);

  // Verificación en BD
  const run = await prisma.workflowRun.findUnique({ where: { id: r1.id }, include: { stepLogs: true, workflow: true } });
  console.log("workflow:", run?.workflow?.slug, "| status:", run?.status, "| input.to:", (run?.input as { to?: string })?.to);
  for (const l of run?.stepLogs ?? []) console.log(`  step ${l.stepName} → ${l.status} (node=${l.nodeId ?? "-"})`);

  const logs = await prisma.emailLog.findMany({ orderBy: { createdAt: "desc" }, take: 3 });
  console.log("EmailLog recientes:");
  for (const e of logs) console.log(`  to=${e.to} subject="${e.subject}" status=${e.status} template=${e.templateKey}`);

  const counts = await prisma.workflowRun.groupBy({ by: ["status"], where: { workflow: { slug: "email-agent" } }, _count: true });
  console.log("runs email-agent por status:", JSON.stringify(counts));

  await prisma.$disconnect();
  console.log("\nOK: flujo email-agent validado end-to-end");
}

main().catch((e) => {
  console.error("ERR:", e?.message ?? e);
  process.exit(1);
});
