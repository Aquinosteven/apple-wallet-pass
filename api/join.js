import { verifySignedToken } from "./_token.js";

const MAX_SHORT_JOIN_URL_LENGTH = 1900;

function jsonError(res, status = 400) {
  res.status(status).json({ ok: false, error: "INVALID_OR_EXPIRED" });
}

function shortUrlTooLongResponse(res, shortJoinUrlLength, joinUrlLength) {
  return res.status(400).json({
    ok: false,
    error: "URL_TOO_LONG",
    details: { shortJoinUrlLength, joinUrlLength },
  });
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key");
}

function getBaseUrl(req) {
  const protoRaw = req.headers["x-forwarded-proto"] || "https";
  const envHost = process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL || "";
  const hostRaw = req.headers["x-forwarded-host"] || req.headers.host || envHost;
  const requestedProtocol = String(protoRaw).split(",")[0].trim().toLowerCase();
  const protocol = requestedProtocol === "https" || requestedProtocol === "http"
    ? requestedProtocol
    : "https";
  const host = String(hostRaw).split(",")[0].trim();
  if (!host) return null;
  if (host === String(envHost).trim()) {
    return `https://${host}`;
  }
  return `${protocol}://${host}`;
}

export default async function handler(req, res) {
  setCors(res);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");

  if (req.method === "OPTIONS") {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  const secret = process.env.GHL_PASS_SECRET;
  if (!secret) {
    return res.status(500).json({ ok: false, error: "MISSING_GHL_PASS_SECRET" });
  }

  const token = req.query?.token ? String(req.query.token) : "";
  const verified = verifySignedToken(token, secret, "join_redirect");
  if (!verified.ok) return jsonError(res, 400);

  const joinUrl = verified.payload?.joinUrl ? String(verified.payload.joinUrl) : "";
  if (!joinUrl || !joinUrl.startsWith("https://")) return jsonError(res, 400);
  const baseUrl = getBaseUrl(req);
  const shortJoinUrl = baseUrl
    ? `${baseUrl}/api/join?token=${encodeURIComponent(token)}`
    : `/api/join?token=${encodeURIComponent(token)}`;
  if (shortJoinUrl.length > MAX_SHORT_JOIN_URL_LENGTH) {
    return shortUrlTooLongResponse(res, shortJoinUrl.length, joinUrl.length);
  }

  try {
    new URL(joinUrl);
  } catch {
    return jsonError(res, 400);
  }

  res.statusCode = 302;
  res.setHeader("Location", joinUrl);
  return res.end();
}
