import crypto from "crypto";

function base64urlEncode(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(String(input), "utf8");
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64urlDecode(input) {
  if (typeof input !== "string" || !input) return null;
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  try {
    return Buffer.from(normalized + padding, "base64");
  } catch {
    return null;
  }
}

function signSegment(payloadSegment, secret) {
  return base64urlEncode(
    crypto.createHmac("sha256", secret).update(payloadSegment).digest()
  );
}

export function createSignedToken(payload, secret) {
  if (!secret) throw new Error("Missing signing secret");
  const payloadSegment = base64urlEncode(JSON.stringify(payload));
  const signatureSegment = signSegment(payloadSegment, secret);
  return `${payloadSegment}.${signatureSegment}`;
}

export function verifySignedToken(token, secret, expectedType) {
  if (!token || !secret) return { ok: false, error: "INVALID_OR_EXPIRED" };

  const [payloadSegment, signatureSegment] = String(token).split(".");
  if (!payloadSegment || !signatureSegment) {
    return { ok: false, error: "INVALID_OR_EXPIRED" };
  }

  const expectedSignature = signSegment(payloadSegment, secret);
  const provided = Buffer.from(signatureSegment);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return { ok: false, error: "INVALID_OR_EXPIRED" };
  }

  const payloadBuffer = base64urlDecode(payloadSegment);
  if (!payloadBuffer) return { ok: false, error: "INVALID_OR_EXPIRED" };

  let payload;
  try {
    payload = JSON.parse(payloadBuffer.toString("utf8"));
  } catch {
    return { ok: false, error: "INVALID_OR_EXPIRED" };
  }

  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "INVALID_OR_EXPIRED" };
  }

  if (expectedType && payload.type !== expectedType) {
    return { ok: false, error: "INVALID_OR_EXPIRED" };
  }

  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(payload.exp) || payload.exp <= now) {
    return { ok: false, error: "INVALID_OR_EXPIRED" };
  }

  return { ok: true, payload };
}
