import { NextResponse } from "next/server";
import { runAgent } from "@/../agent";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}

export async function POST(req: Request) {
  const { message, agentSlug, storeId } = await req.json();
  if (!message) return NextResponse.json({ error: "message required" }, { status: 400, headers: corsHeaders() });
  try {
    const result = await runAgent({ agentSlug: agentSlug ?? "sales-assistant", input: message, storeId });
    return NextResponse.json({ text: result.text, toolCalls: result.toolCalls }, { headers: corsHeaders() });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500, headers: corsHeaders() });
  }
}
