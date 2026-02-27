import crypto from "node:crypto";

function normalizeText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function secureEqual(left, right) {
  const leftBuf = Buffer.from(String(left || ""), "utf8");
  const rightBuf = Buffer.from(String(right || ""), "utf8");
  if (!leftBuf.length || !rightBuf.length || leftBuf.length !== rightBuf.length) return false;
  return crypto.timingSafeEqual(leftBuf, rightBuf);
}

function extractSignature(headerValue) {
  const raw = normalizeText(headerValue);
  if (!raw) return "";
  const parts = raw.split(",").map((part) => part.trim()).filter(Boolean);
  for (const part of parts) {
    if (part.startsWith("sha256=")) return part.slice("sha256=".length);
  }
  return parts[0] || "";
}

export function signWebhookPayload(rawBody, secret) {
  return crypto.createHmac("sha256", String(secret || "")).update(String(rawBody || ""), "utf8").digest("hex");
}

export function verifyWebhookSignature(input) {
  const signatureHeader = normalizeText(input.signatureHeader || "");
  const rawBody = String(input.rawBody || "");
  const now = input.now instanceof Date ? input.now : new Date();
  const currentSecret = normalizeText(input.currentSecret || "");
  const previousSecret = normalizeText(input.previousSecret || "");
  const previousSecretExpiresAt = input.previousSecretExpiresAt ? new Date(input.previousSecretExpiresAt) : null;

  if (!signatureHeader) {
    return { ok: false, matched: "none", error: "MISSING_SIGNATURE" };
  }

  const provided = extractSignature(signatureHeader);
  if (!provided) {
    return { ok: false, matched: "none", error: "INVALID_SIGNATURE_FORMAT" };
  }

  if (currentSecret) {
    const expectedCurrent = signWebhookPayload(rawBody, currentSecret);
    if (secureEqual(provided, expectedCurrent)) {
      return { ok: true, matched: "current", error: null };
    }
  }

  if (previousSecret && previousSecretExpiresAt instanceof Date && Number.isFinite(previousSecretExpiresAt.valueOf())) {
    if (previousSecretExpiresAt.valueOf() >= now.valueOf()) {
      const expectedPrevious = signWebhookPayload(rawBody, previousSecret);
      if (secureEqual(provided, expectedPrevious)) {
        return { ok: true, matched: "previous", error: null };
      }
    }
  }

  return { ok: false, matched: "none", error: "SIGNATURE_VERIFICATION_FAILED" };
}
