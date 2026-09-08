import { NextResponse } from "next/server";
import { prisma } from "@/lib/adapters/prisma";

const codes = (globalThis as unknown as { __acs2fa?: Map<string, { code: string; exp: number }> }).__acs2fa ?? new Map();
(globalThis as unknown as { __acs2fa?: Map<string, { code: string; exp: number }> }).__acs2fa = codes;

export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({}));
  if (!email) return NextResponse.json({ error: "Email requerido" }, { status: 400 });
  const normalized = String(email).toLowerCase().trim();
  const user = await prisma.adminUser.findUnique({ where: { email: normalized } }).catch(() => null);
  if (!user) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
  const code = String(Math.floor(100000 + Math.random() * 900000));
  codes.set(normalized, { code, exp: Date.now() + 5 * 60 * 1000 });
  const { default: sendEmail } = await import("@/../agent/tools/send-email");
  await sendEmail.execute({ to: normalized, subject: "Tu código StarShop", template: "general", text: `Tu código de verificación (5 min): ${code}` } as never).catch(() => {});
  const isDev = process.env.NODE_ENV !== "production";
  return NextResponse.json({ ok: true, message: "Código enviado al correo.", ...(isDev ? { debugCode: code } : {}) });
}

export function __get2faStore() {
  return codes;
}
