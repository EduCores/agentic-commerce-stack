import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, AUTH_COOKIE } from "@/lib/auth";

export async function GET() {
  const token = (await cookies()).get(AUTH_COOKIE.name)?.value;
  if (!token) return NextResponse.json({ admin: null }, { status: 401 });
  const session = await verifySessionToken(token);
  if (!session) return NextResponse.json({ admin: null }, { status: 401 });
  return NextResponse.json({ admin: session });
}
