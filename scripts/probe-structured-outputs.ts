/**
 * Probe de Structured Outputs (npm run acs:probe-structured).
 *
 * PARA QUÉ: el soporte de `response_format` / `json_schema strict` es POR MODELO Y
 * POR ENDPOINT, y el enforcement varía (medido: groq/qwen/qwen3.8-27b acepta
 * strict pero no lo aplica; groq/openai/gpt-oss-120b devuelve 400). Antes de
 * cambiar `VERIFIED_MODES` en agent/lib/structured-output.ts, corre este probe y
 * pega el resultado: así la tabla de capacidades es dato medido, no suposición.
 *
 * Uso:
 *   npx tsx scripts/probe-structured-outputs.ts                 (los verificados con JSON, sin :free)
 *   npx tsx scripts/probe-structured-outputs.ts --all           (toda la cadena, incluidos :free)
 *   npx tsx scripts/probe-structured-outputs.ts --only=groq     (filtra por substring)
 *   npx tsx scripts/probe-structured-outputs.ts --mode=json_object
 *
 * OJO: gasta 1 request por modelo×modo (los :free tienen cuota diaria de 50).
 */
import { readFileSync } from "node:fs";
import type { JsonMode } from "../agent/lib/structured-output";

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
  } catch {}
}

loadEnv();

const ALL = process.argv.includes("--all");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1];
const MODE_OVERRIDE = process.argv.find((a) => a.startsWith("--mode="))?.split("=")[1];

async function main() {
  const { buildModelChain } = await import("../prisma/starshop-prompts");
  const { resolveModel, headersFor } = await import("../agent/lib/model-provider");
  const { buildAttempt, isJsonModeFailure, modesFor, unreliableSummary } = await import(
    "../agent/lib/structured-output"
  );

  const SCHEMA = {
    name: "starshop_intent",
    schema: {
      type: "object",
      properties: {
        intent: { type: "string", enum: ["product_search", "general_inquiry"] },
        confidence: { type: "number" },
      },
      required: ["intent", "confidence"],
      additionalProperties: false,
    },
  };

  const chain = buildModelChain().filter((m) => (ONLY ? m.includes(ONLY) : true));
  console.log("=== PROBE STRUCTURED OUTPUTS ===");
  console.log(`modelos: ${chain.length}${ONLY ? ` (filtro "${ONLY}")` : ""}${ALL ? " (incluye :free)" : " (omite :free)"}\n`);

  for (const id of chain) {
    if (!ALL && id.endsWith(":free")) {
      console.log(`${id}: omitido (:free, usa --all para probarlo)`);
      continue;
    }
    const r = resolveModel(id);
    if (!r) {
      console.log(`${id}: sin credencial, omitido`);
      continue;
    }
    const modes: JsonMode[] = MODE_OVERRIDE ? [MODE_OVERRIDE as JsonMode] : modesFor(id);
    for (const mode of modes) {
      const attempt = buildAttempt(id, mode, SCHEMA);
      const body = {
        model: r.upstreamId,
        temperature: 0,
        max_tokens: 80,
        messages: [
          {
            role: "system",
            content:
              'Clasifica la intención del cliente. Responde SOLO JSON: {"intent":"product_search|general_inquiry","confidence":0.0-1.0}',
          },
          { role: "user", content: "hola, tienes taladros?" },
        ],
        ...(attempt.responseFormat ? { response_format: attempt.responseFormat } : {}),
        ...attempt.extras,
      };
      const t0 = Date.now();
      try {
        const resp = await fetch(`${r.baseURL}/chat/completions`, {
          method: "POST",
          headers: headersFor(r),
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(20_000),
        });
        const text = await resp.text();
        const ms = Date.now() - t0;
        if (!resp.ok) {
          const kind = isJsonModeFailure(resp.status, text) ? "JSON inválido (el modo no sirve aquí)" : "error";
          console.log(`${id} · ${mode} → HTTP ${resp.status} (${kind}, ${ms}ms)`);
          continue;
        }
        const j = JSON.parse(text) as { choices?: { message?: { content?: string } }[] };
        const raw = (j.choices?.[0]?.message?.content ?? "").trim();
        const json = raw.match(/\{[\s\S]*\}/);
        let parsed = false;
        try {
          const o = json ? (JSON.parse(json[0]) as { intent?: unknown }) : null;
          parsed = !!o && typeof o.intent === "string";
        } catch {
          parsed = false;
        }
        if (parsed) {
          console.log(
            `${id} · ${mode} → HTTP 200 (${ms}ms) JSON válido${mode !== "text" ? ` — sugerencia: VERIFIED_MODES["${id}"] = "${mode}"` : ""}`
          );
        } else {
          console.log(`${id} · ${mode} → HTTP 200 (${ms}ms) SIN JSON: ${raw.slice(0, 70).replace(/\s+/g, " ")}`);
        }
      } catch (e) {
        console.log(`${id} · ${mode} → red/timeout: ${e instanceof Error ? e.message : e}`);
      }
    }
  }

  const fallos = unreliableSummary();
  if (fallos.length > 0) {
    console.log("\naprendido en runtime (marcados no fiables):");
    for (const f of fallos) console.log(`  ${f.model}: ${f.modes.join(", ")}`);
  }
}

main().catch((e) => {
  console.error("Error en probe-structured-outputs:", e);
  process.exitCode = 1;
});
