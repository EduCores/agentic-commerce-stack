import { NextResponse } from "next/server";
import { runAgent } from "@/../agent";

export async function POST(req: Request) {
  const { message, agentSlug, storeId } = await req.json();
  if (!message) return NextResponse.json({ error: "message required" }, { status: 400 });
  try {
    const result = await runAgent({ agentSlug: agentSlug ?? "sales-assistant", input: message, storeId });
    return NextResponse.json({ text: result.text, toolCalls: result.toolCalls });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
