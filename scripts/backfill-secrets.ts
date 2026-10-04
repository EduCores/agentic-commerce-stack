/**
 * Backfill de cifrado — `npx tsx scripts/backfill-secrets.ts`.
 *
 * Cifra apiKey/apiSecret de StoreConnection y accessToken/appSecret de
 * MetaConnection que aún estén en texto plano (formato `enc:v1:`).
 * Idempotente: omite filas ya cifradas. Reporta conteo por tabla.
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
  const { encryptSecret, isEncrypted } = await import("../src/lib/crypto");
  let stores = 0;
  let metas = 0;
  const allStores = await prisma.storeConnection.findMany({ select: { id: true, apiKey: true, apiSecret: true } });
  for (const s of allStores) {
    const patch: Record<string, string> = {};
    if (s.apiKey && !isEncrypted(s.apiKey)) patch.apiKey = encryptSecret(s.apiKey);
    if (s.apiSecret && !isEncrypted(s.apiSecret)) patch.apiSecret = encryptSecret(s.apiSecret);
    if (Object.keys(patch).length > 0) {
      await prisma.storeConnection.update({ where: { id: s.id }, data: patch });
      stores++;
    }
  }
  const allMetas = await prisma.metaConnection.findMany({ select: { id: true, accessToken: true, appSecret: true } });
  for (const m of allMetas) {
    const patch: Record<string, string> = {};
    if (m.accessToken && !isEncrypted(m.accessToken)) patch.accessToken = encryptSecret(m.accessToken);
    if (m.appSecret && !isEncrypted(m.appSecret)) patch.appSecret = encryptSecret(m.appSecret);
    if (Object.keys(patch).length > 0) {
      await prisma.metaConnection.update({ where: { id: m.id }, data: patch });
      metas++;
    }
  }
  console.log(`BACKFILL OK: ${stores} tienda(s), ${metas} conexion(es) Meta cifradas.`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("BACKFILL FAIL:", e instanceof Error ? e.message : e);
  process.exit(1);
});
