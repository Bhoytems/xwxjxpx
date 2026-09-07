import { NextRequest, NextResponse } from "next/server";
import { checkPasscode, createSessionToken, ADMIN_COOKIE_NAME } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  const { passcode } = await req.json();
  if (typeof passcode !== "string" || !checkPasscode(passcode)) {
    return NextResponse.json({ ok: false, error: "Incorrect passcode." }, { status: 401 });
  }
  const token = createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}
