import crypto from "node:crypto";
import { rejectDisallowedOrigin, setJsonCors } from "../../lib/apiAuth.js";
import { getSupabaseAdmin } from "../../lib/ghlIntegration.js";
import {
  adaptivePollDelaySeconds,
  createEmbedSessionToken,
  DEFAULT_EMBED_SESSION_TTL_SECONDS,
  hashSessionToken,
} from "../../lib/threadA/embedSession.js";
import { readJsonBodyStrict } from "../../lib/requestValidation.js";
import { createTokenBucketLimiter } from "../../lib/rateLimit.js";
import { getClientIp, sendRateLimitExceeded, setNoStore } from "../../lib/security.js";
import { validateSharedSecretHeader } from "../../lib/sharedSecret.js";

const embedSessionLimiter = createTokenBucketLimiter({
  scope: "embed_session_ip",
  capacity: 20,
  windowSeconds: 60,
});

function normalizeText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function getEmbedSecret() {
  return normalizeText(process.env.EMBED_SESSION_SECRET || process.env.GHL_PASS_SECRET);
}

function randomToken() {
  return crypto.randomBytes(16).toString("hex");
}

export function createEmbedSessionHandler(deps = {}) {
  const getSupabaseAdminImpl = deps.getSupabaseAdmin || getSupabaseAdmin;

  return async function handler(req, res) {
    const cors = setJsonCors(req, res, ["POST", "OPTIONS"], {
      allowAuth: false,
      additionalHeaders: ["x-embed-secret", "x-ghl-secret"],
    });
    setNoStore(res);
    if (req.method === "OPTIONS") return cors.originAllowed
      ? res.status(204).end()
      : res.status(403).json({ ok: false, error: "Origin not allowed" });
    if (rejectDisallowedOrigin(res, cors)) return;
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method Not Allowed" });
    }

    try {
      const byIp = embedSessionLimiter(getClientIp(req));
      if (!byIp.allowed) {
        return sendRateLimitExceeded(res, byIp.retryAfterSeconds);
      }

      const parsed = await readJsonBodyStrict(req);
      if (!parsed.ok) {
        return res.status(parsed.status).json({ ok: false, error: parsed.error });
      }

      const body = parsed.body && typeof parsed.body === "object" ? parsed.body : {};
      const accountId = normalizeText(body.accountId);
      const issuanceRequestId = normalizeText(body.issuanceRequestId);
      if (!accountId || !issuanceRequestId) {
        return res.status(400).json({ ok: false, error: "accountId and issuanceRequestId are required" });
      }

      const secret = getEmbedSecret();
      if (!secret) {
        return res.status(500).json({ ok: false, error: "Missing EMBED_SESSION_SECRET (or GHL_PASS_SECRET fallback)" });
      }

      const auth = validateSharedSecretHeader(req, secret, ["x-embed-secret", "x-ghl-secret"]);
      if (!auth.ok) {
        return res.status(auth.status).json({ ok: false, error: auth.error });
      }

      const supabase = getSupabaseAdminImpl();
      const { data: issuance, error: issuanceError } = await supabase
        .from("issuance_requests")
        .select("id,account_id")
        .eq("id", issuanceRequestId)
        .eq("account_id", accountId)
        .maybeSingle();

      if (issuanceError) {
        return res.status(500).json({ ok: false, error: issuanceError.message });
      }

      if (!issuance) {
        return res.status(404).json({ ok: false, error: "Issuance request not found for account" });
      }

      const statusPageToken = randomToken();
      const token = createEmbedSessionToken({
        accountId,
        issuanceRequestId,
        statusPageToken,
      }, secret, DEFAULT_EMBED_SESSION_TTL_SECONDS);

      const tokenHash = hashSessionToken(token);
      const expiresAt = new Date(Date.now() + DEFAULT_EMBED_SESSION_TTL_SECONDS * 1000).toISOString();

      const { data, error } = await supabase
        .from("embed_sessions")
        .insert({
          issuance_request_id: issuanceRequestId,
          account_id: accountId,
          token_hash: tokenHash,
          expires_at: expiresAt,
          status_page_token: statusPageToken,
          status: "pending",
        })
        .select("id,expires_at,status_page_token")
        .single();

      if (error) {
        return res.status(500).json({ ok: false, error: error.message });
      }

      return res.status(201).json({
        ok: true,
        sessionToken: token,
        expiresAt: data.expires_at,
        poll: {
          initialSeconds: 1,
          scheduleHint: [1, 2, 5],
          nextSeconds: adaptivePollDelaySeconds(0),
        },
        statusPageUrl: `/api/embed/status-page?token=${encodeURIComponent(data.status_page_token)}`,
      });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };
}

export default createEmbedSessionHandler();
