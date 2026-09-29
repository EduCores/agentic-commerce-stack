import { readFileSync } from "node:fs";
import { generateText } from "ai";
import { sdkModelFor } from "../agent/lib/model-provider";

for (const raw of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith("#")) continue;
  const eq = line.indexOf("=");
  if (eq === -1) continue;
  const key = line.slice(0, eq).trim();
  const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  if (!process.env[key]) process.env[key] = value;
}

async function main() {
  const r = await generateText({
    model: sdkModelFor("gemini/gemini-flash-lite-latest") as never,
    prompt: "Responde exactamente: OK-SDK",
  });
  console.log("SDK_TEXT=" + r.text);
}

main().catch((e: unknown) => {
  const err = e as { message?: string; statusCode?: number; responseBody?: string; cause?: unknown };
  console.error("SDK_ERR=" + (err?.message ?? String(e)));
  if (err?.statusCode) console.error("SDK_STATUS=" + err.statusCode);
  if (err?.responseBody) console.error("SDK_BODY=" + String(err.responseBody).slice(0, 500));
  if (err?.cause) console.error("SDK_CAUSE=" + String(err.cause).slice(0, 500));
  process.exit(1);
});
