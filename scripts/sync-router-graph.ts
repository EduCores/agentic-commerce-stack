/**
 * Resetea el grafo publicado del router (WorkflowDefinition "starshop-intent-router")
 * al grafo por defecto del código (src/workflows/starshop-router.ts) y verifica que
 * el runtime (agent/index.ts + agent/lib/crew-graph.ts) lea esa configuración.
 *
 * Cuándo usarlo:
 * - Al cambiar el grafo por defecto en código y querer propagarlo a la BD
 *   (el seed solo escribe el grafo al CREAR el workflow, para no pisar ediciones).
 * - Para recuperar el estado conocido si una edición en /workflows dejó el grafo roto.
 *
 * Uso: npx tsx scripts/sync-router-graph.ts
 */
import { readFileSync } from "node:fs";

/** Carga .env (tsx no lo hace): debe ejecutarse ANTES de importar el adapter de Prisma. */
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

async function main() {
  loadEnv();
  const { prisma } = await import("../src/lib/adapters/prisma");
  const { starShopRouterGraph, starShopRouterSteps } = await import("../src/workflows/starshop-router");
  const { getCrewConfig, refreshCrewOverrides } = await import("../agent/index");
  const { STARSHOP_INTENTS, STARSHOP_CREW_TOOLS } = await import("../prisma/starshop-prompts");

  console.log("DATABASE_URL host:", (process.env.DATABASE_URL ?? "").match(/@([^/]+)/)?.[1] ?? "(prisma+postgres)");

  const updated = await prisma.workflowDefinition.update({
    where: { slug: "starshop-intent-router" },
    data: { graph: starShopRouterGraph, steps: starShopRouterSteps, isActive: true, version: { increment: 1 } },
  });
  console.log("grafo publicado:", updated.slug, "v" + updated.version, "isActive:", updated.isActive);

  const overrides = await refreshCrewOverrides();
  console.log("intents con override:", overrides ? Object.keys(overrides).join(", ") : "(null -> fallback codigo)");

  // Con el grafo espejo del código, cada intent debe resolver a la misma config del código
  let ok = true;
  for (const intent of STARSHOP_INTENTS) {
    const crew = await getCrewConfig(intent);
    const toolsOk = crew.tools.join(",") === (STARSHOP_CREW_TOOLS[intent] ?? []).join(",");
    if (!toolsOk) ok = false;
    console.log(`${intent.padEnd(17)} slug=${crew.slug} model=${crew.model} tools_ok=${toolsOk} prompt_len=${crew.prompt.length}`);
  }
  console.log(ok ? "OK: runtime == config del codigo" : "ATENCION: hay diferencias en las tools");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});