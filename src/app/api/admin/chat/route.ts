import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, AUTH_COOKIE } from "@/lib/auth";
import { runAdminOps } from "@/../agent";

/**
 * POST /api/admin/chat — Admin Ops DEDICADO (dueño).
 * Siempre crew starshop-admin-ops, sin heurística, sin flag isAdmin.
 * Requiere JWT admin (cookie acs_admin_token). Key propia OPENROUTER_ADMIN_KEY.
 * Comparte código (tools, prisma, prompts) con tienda, pero NO runtime.
 */
export async function POST(req: Request) {
  const token = (await cookies()).get(AUTH_COOKIE.name)?.value;
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const session = await verifySessionToken(token);
  if (!session) return NextResponse.json({ error: "Sesión expirada" }, { status: 401 });

  const { message, history, storeId } = await req.json().catch(() => ({}));
  if (!message) return NextResponse.json({ error: "message required" }, { status: 400 });

  try {
    const result = await runAdminOps({ input: message, history: history ?? [], storeId: storeId ?? "seed-store" });
    const rawCalls = (result.toolCalls ?? []) as unknown as Array<Record<string, unknown>>;
    const toolCalls = rawCalls.map((tc) => {
      const toolName = (tc.toolName ?? tc.name) as string | undefined;
      const input = (tc.input ?? tc.args ?? {}) as Record<string, unknown>;
      const output = (tc.output ?? {}) as Record<string, unknown>;
      return { toolName, args: input, output };
    });
    const text = (result.text ?? "").trim() || "Revisa /products, /orders o /workflows para más detalle.";
    return NextResponse.json({ text, toolCalls, detectedIntent: "admin_ops", crew: "starshop-admin-ops" });
  } catch (e) {
    console.error("[API-ADMIN-CHAT] Error:", e);
    return NextResponse.json({ error: "Internal server error", detail: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
