import crypto from "crypto";

const COOKIE_NAME = "wj_admin_session";

function secret() {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s) throw new Error("Missing ADMIN_SESSION_SECRET env var");
  return s;
}

// Builds a signed, expiring token so the admin session can't be forged
// even though the passcode itself is a short static string.
export function createSessionToken(): string {
  const issuedAt = Date.now().toString();
  const sig = crypto.createHmac("sha256", secret()).update(issuedAt).digest("hex");
  return `${issuedAt}.${sig}`;
}

export function isValidSessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const [issuedAt, sig] = token.split(".");
  if (!issuedAt || !sig) return false;
  const expected = crypto.createHmac("sha256", secret()).update(issuedAt).digest("hex");
  const valid = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  if (!valid) return false;
  const ageMs = Date.now() - Number(issuedAt);
  const maxAgeMs = 1000 * 60 * 60 * 12; // 12 hour session
  return ageMs >= 0 && ageMs < maxAgeMs;
}

export function checkPasscode(input: string): boolean {
  const expected = process.env.ADMIN_PASSCODE || "022005";
  if (input.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(input), Buffer.from(expected));
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
