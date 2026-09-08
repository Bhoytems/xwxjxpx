import crypto from "crypto";

// We never store raw IP/user-agent - only a salted hash ("fingerprint").
export function makeFingerprint(ip: string, userAgent: string, telegramId?: number | null) {
  const salt = process.env.FINGERPRINT_SALT || "wj-bot-salt";
  const base = `${ip}|${userAgent}|${telegramId ?? ""}`;
  return crypto.createHash("sha256").update(salt + base).digest("hex");
}

export type ClickCheckResult = { allow: boolean; reason?: string };

/**
 * Decide whether a click should be rewarded.
 * - The publisher (link owner) clicking their own link is never rewarded.
 * - The same fingerprint can only be rewarded once per task link (no repeat clicks).
 * - A fingerprint that has hit an unusual number of *different* links in a short
 *   window is flagged as likely automated / click-farming.
 */
export function evaluateClick(params: {
  isOwnerClick: boolean;
  alreadyRewardedForThisLink: boolean;
  recentDistinctLinksForFingerprint: number;
}): ClickCheckResult {
  if (params.isOwnerClick) {
    return { allow: false, reason: "self_click" };
  }
  if (params.alreadyRewardedForThisLink) {
    return { allow: false, reason: "duplicate_click" };
  }
  if (params.recentDistinctLinksForFingerprint > 15) {
    return { allow: false, reason: "rate_anomaly" };
  }
  return { allow: true };
}
