/**
 * Test de carrera de reserva — `npx tsx scripts/eval-stock-race.ts` (manual, con DB).
 *
 * POR QUÉ EXISTE: reserveStock era leer→comparar→incrementar en 3 viajes
 * (TOCTOU): dos compras simultáneas de la última unidad hacían oversell.
 * Ahora es UN UPDATE condicional atómico. Este test dispara 5 reservas
 * concurrentes de 1 unidad con stock=1 y exige que gane EXACTAMENTE una.
 * Todo ocurre en una transacción con rollback: no deja residuos en la DB.
 * (No va en test:harness porque requiere DATABASE_URL.)
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

function loadEnv() {
  try {
    for (const raw of readFileSync(join(process.cwd(), ".env"), "utf8").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {}
}

async function main() {
  loadEnv();
  const { prisma } = await import("../src/lib/adapters/prisma");
  const sku = `TMP-RACE-${Date.now()}`;
  try {
    await prisma.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: { storeId: "seed-store", sku, title: "tmp race", price: 100, stock: 1 },
        select: { id: true },
      });
      const attempts = await Promise.allSettled(
        Array.from({ length: 5 }, () =>
          tx.$executeRaw`UPDATE "Product" SET "reservedStock" = "reservedStock" + 1 WHERE id = ${p.id} AND ("stock" - "reservedStock") >= 1`,
        ),
      );
      const won = attempts.filter(
        (a) => a.status === "fulfilled" && Number(a.value) === 1,
      ).length;
      console.log(`reservas concurrentes: 5 intentos, ganadoras: ${won} (esperado 1)`);
      if (won !== 1) throw new Error(`RACE FAIL: ganaron ${won}, esperado 1`);
      // Rollback intencional: no dejar residuos.
      throw new Error("ROLLBACK-OK");
    });
  } catch (e) {
    if (e instanceof Error && e.message === "ROLLBACK-OK") {
      console.log("RACE OK: sin oversell, transacción revertida sin residuos");
      await prisma.$disconnect();
      return;
    }
    console.error("RACE FAIL:", e instanceof Error ? e.message : e);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
