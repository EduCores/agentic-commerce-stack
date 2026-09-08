/**
 * Guardián de env — evita que una DATABASE_URL del sistema opaque el .env
 * (caso real: apuntaba a la DB local de otro proyecto y Prisma migraba/sembraba ahí).
 * Solo compara hosts, jamás imprime secretos. Exit 1 si hay sombra.
 */
import { readFileSync } from "node:fs";

function hostOf(url) {
  if (!url) return "";
  const m = String(url).match(/@([^/]+)/);
  return m ? m[1] : "";
}

function envFileUrl() {
  try {
    const raw = readFileSync(".env", "utf8");
    const line = raw.split("\n").map((l) => l.trim()).find((l) => l.startsWith("DATABASE_URL=") && !l.startsWith("DATABASE_URL_POOLED"));
    if (!line) return "";
    return line.replace(/^DATABASE_URL="/, "").replace(/"$/, "").replace(/^DATABASE_URL=/, "");
  } catch {
    return "";
  }
}

const procHost = hostOf(process.env.DATABASE_URL);
const fileHost = hostOf(envFileUrl());

if (procHost && fileHost && procHost !== fileHost) {
  console.error(`[check-env] BLOQUEADO: tu sistema define DATABASE_URL hacia "${procHost}" pero .env apunta a "${fileHost}".`);
  console.error(`[check-env] Bórrala del sistema (PowerShell): [Environment]::SetEnvironmentVariable('DATABASE_URL', $null, 'User')`);
  console.error(`[check-env] …y cierra/reabre la terminal. No ejecuto nada contra la DB equivocada.`);
  process.exit(1);
}
console.log(`[check-env] OK (DB host: ${fileHost || procHost || "?"})`);
