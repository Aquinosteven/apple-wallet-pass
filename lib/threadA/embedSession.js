import crypto from "node:crypto";
import { createSignedToken, verifySignedToken } from "../token.js";

const EMBED_SESSION_TOKEN_TYPE = "embed_session";
const DEFAULT_EMBED_SESSION_TTL_SECONDS = 60;
const STATUS_PAGE_FALLBACK_SECONDS = 20;
const BACKEND_MAX_WAIT_SECONDS = 120;

function normalizeText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

export function createEmbedSessionToken(payload, secret, ttlSeconds = DEFAULT_EMBED_SESSION_TTL_SECONDS) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const exp = issuedAt + Math.max(5, Math.floor(Number(ttlSeconds) || DEFAULT_EMBED_SESSION_TTL_SECONDS));
  return createSignedToken({
    type: EMBED_SESSION_TOKEN_TYPE,
    accountId: payload.accountId,
    issuanceRequestId: payload.issuanceRequestId,
    statusPageToken: payload.statusPageToken,
    iat: issuedAt,
    exp,
  }, secret);
}

export function verifyEmbedSessionToken(token, secret) {
  return verifySignedToken(token, secret, EMBED_SESSION_TOKEN_TYPE);
}

export function hashSessionToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

export function adaptivePollDelaySeconds(elapsedSeconds) {
  if (elapsedSeconds < 4) return 1;
  if (elapsedSeconds < 12) return 2;
  return 5;
}

export function shouldShowStatusPageLink(elapsedSeconds) {
  return Number(elapsedSeconds) >= STATUS_PAGE_FALLBACK_SECONDS;
}

export function hasBackendTimedOut(elapsedSeconds) {
  return Number(elapsedSeconds) >= BACKEND_MAX_WAIT_SECONDS;
}

export function buildNoJsStatusHtml(statusPageUrl, title = "Generating your pass") {
  const safeUrl = normalizeText(statusPageUrl);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; color: #111827;">
  <h1 style="font-size: 20px; margin-bottom: 8px;">${title}</h1>
  <p style="margin: 0 0 8px;">Your pass is being generated.</p>
  <p style="margin: 0;">If this takes longer than usual, open the status page:</p>
  <p style="margin-top: 8px;"><a href="${safeUrl}">${safeUrl}</a></p>
</body>
</html>`;
}

export {
  BACKEND_MAX_WAIT_SECONDS,
  DEFAULT_EMBED_SESSION_TTL_SECONDS,
  STATUS_PAGE_FALLBACK_SECONDS,
};
