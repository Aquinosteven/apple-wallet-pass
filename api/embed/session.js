import crypto from "node:crypto";
import { getSupabaseAdmin } from "../../lib/ghlIntegration.js";
import {
  adaptivePollDelaySeconds,
  createEmbedSessionToken,
  DEFAULT_EMBED_SESSION_TTL_SECONDS,
  hashSessionToken,
} from "../../lib/threadA/embedSession.js";
import { readJsonBodyStrict } from "../../lib/requestValidation.js";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

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

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
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

    const statusPageToken = randomToken();
    const token = createEmbedSessionToken({
      accountId,
      issuanceRequestId,
      statusPageToken,
    }, secret, DEFAULT_EMBED_SESSION_TTL_SECONDS);

    const tokenHash = hashSessionToken(token);
    const expiresAt = new Date(Date.now() + DEFAULT_EMBED_SESSION_TTL_SECONDS * 1000).toISOString();

    const supabase = getSupabaseAdmin();
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
}
