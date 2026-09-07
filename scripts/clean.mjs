#!/usr/bin/env node
/**
 * scripts/clean.mjs — ACS
 * Limpia artefactos regenerables que causan "peso excesivo" y "PC se fue a negro".
 * Uso:
 *   npm run clean              # limpia .next + dev cache + tsbuildinfo (seguro)
 *   npm run clean:cache        # solo .next/dev y .next/cache
 *   node scripts/clean.mjs --all  # también node_modules/.cache (agresivo)
 */
import { rmSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const cacheOnly = process.argv.includes("--cache-only");
const all = process.argv.includes("--all");

function sizeMb(path) {
  try {
    const s = statSync(path);
    return s.isDirectory() ? null : s.size / 1024 / 1024;
  } catch { return null; }
}

function rm(target, label) {
  const full = join(root, target);
  if (!existsSync(full)) {
    console.log(`  · ${label} — no existe, skip`);
    return 0;
  }
  try {
    // estima tamaño antes de borrar
    let mb = 0;
    try {
      const { execSync } = awaitImport();
      // fallback simple: no calculamos recursivo aquí para no tardar
    } catch {}
    rmSync(full, { recursive: true, force: true });
    console.log(`  ✓ ${label} → limpiado (${target})`);
    return 1;
  } catch (e) {
    console.warn(`  ✗ ${label} — ${e.message}`);
    return 0;
  }
}

function awaitImport() { return null; }

console.log("\n[ACS clean] Limpiando artefactos regenerables...\n");

if (cacheOnly) {
  rm(".next/dev", ".next/dev (Turbopack cache 1-2GB)");
  rm(".next/cache", ".next/cache (webpack cache)");
} else {
  rm(".next/dev", ".next/dev (Turbopack cache 1-2GB)");
  rm(".next/cache", ".next/cache");
  if (!all) {
    // conserva .next/build para no perder build prod; borra solo dev
    console.log("  · .next/build — conservado (usa --all para borrarlo)");
  } else {
    rm(".next", ".next completo");
  }
  rm("tsconfig.tsbuildinfo", "tsconfig.tsbuildinfo");
  rm(".turbo", ".turbo");
  // no borra node_modules por defecto — es destructivo y lento de reinstalar
  if (all) {
    rm("node_modules/.cache", "node_modules/.cache");
  }
}

console.log("\n[ACS clean] Hecho. Siguiente paso:");
console.log("  npm run dev   # o npm run acs:dev — regenera .next limpio");
console.log("  npm run build # verifica deploy\n");
