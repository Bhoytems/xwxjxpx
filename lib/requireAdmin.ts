import { NextRequest, NextResponse } from "next/server";
import { isValidSessionToken, ADMIN_COOKIE_NAME } from "./adminAuth";

export function requireAdmin(req: NextRequest): NextResponse | null {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!isValidSessionToken(token)) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }
  return null;
}
