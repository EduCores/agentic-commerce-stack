import { NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE.name, "", { ...AUTH_COOKIE.options, maxAge: 0 });
  return res;
}
export async function GET() {
  return POST();
}
