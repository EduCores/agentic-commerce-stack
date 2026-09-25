import { readFileSync } from "node:fs";

type OpenRouterToolCall = {
  function?: { name?: string; arguments?: string };
};

type OpenRouterMessage = {
  content?: unknown;
  tool_calls?: OpenRouterToolCall[];
};

type OpenRouterResponse = {
  choices?: Array<{ message?: OpenRouterMessage }>;
};

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
const KEY = process.env.OPENROUTER_API_KEY ?? "";
const CANDIDATES = [
  "qwen/qwen3-30b-a3b:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "openai/gpt-oss-20b:free",
  "openai/gpt-oss-120b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "google/gemma-3-27b-it:free",
  "deepseek/deepseek-chat-v3.1:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "z-ai/glm-4.5-air:free",
];

async function probe(model: string) {
  const t0 = Date.now();
  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://localhost",
        "X-Title": "probe",
      },
      body: JSON.stringify({
        model,
        max_tokens: 300,
        messages: [
          { role: "system", content: "Eres Star, asistente StarShop Chile. Responde en español, corto." },
          { role: "user", content: "Hola, ¿tienen taladro percutor 20V con stock?" },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "searchProducts",
              description: "Busca productos",
              parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
            },
          },
        ],
        tool_choice: "auto",
      }),
      signal: AbortSignal.timeout(30000),
    });
    const j = (await r.json().catch(() => ({}))) as OpenRouterResponse;
    const ms = Date.now() - t0;
    if (!r.ok) {
      console.log(`X ${model} HTTP ${r.status} (${ms}ms) :: ${JSON.stringify(j).slice(0, 200)}`);
      return;
    }
    const message = j.choices?.[0]?.message;
    const content = typeof message?.content === "string" ? message.content : JSON.stringify(message?.content ?? "");
    const toolCalls = message?.tool_calls ?? [];
    console.log(`OK ${model} (${ms}ms) toolcalls=${toolCalls.length} :: ${content.slice(0, 220)}`);
    if (toolCalls.length) console.log(`   toolcall: ${JSON.stringify(toolCalls[0]).slice(0, 300)}`);
  } catch (e) {
    console.log(`ERR ${model} :: ${e instanceof Error ? e.message : e}`);
  }
}

async function main() {
  if (!KEY) {
    console.error("sin OPENROUTER_API_KEY");
    process.exit(1);
  }
  const args = process.argv.slice(2);
  const models = args.length ? args : CANDIDATES;
  for (const model of models) await probe(model);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
