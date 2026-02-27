import { getSupabaseAdmin } from "../../lib/ghlIntegration.js";
import { buildClaimUrl } from "../../lib/baseUrl.js";
import {
  adaptivePollDelaySeconds,
  hasBackendTimedOut,
  shouldShowStatusPageLink,
  verifyEmbedSessionToken,
} from "../../lib/threadA/embedSession.js";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function normalizeText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function getEmbedSecret() {
  return normalizeText(process.env.EMBED_SESSION_SECRET || process.env.GHL_PASS_SECRET);
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const token = normalizeText(req.query?.token);
    if (!token) {
      return res.status(400).json({ ok: false, error: "token is required" });
    }

    const secret = getEmbedSecret();
    if (!secret) {
      return res.status(500).json({ ok: false, error: "Missing EMBED_SESSION_SECRET (or GHL_PASS_SECRET fallback)" });
    }

    const verified = verifyEmbedSessionToken(token, secret);
    if (!verified.ok) {
      return res.status(401).json({ ok: false, error: verified.error });
    }

    const startedAt = Number(verified.payload?.iat || Math.floor(Date.now() / 1000));
    const elapsedSeconds = Math.max(0, Math.floor(Date.now() / 1000) - startedAt);

    const supabase = getSupabaseAdmin();
    const issuanceRequestId = String(verified.payload?.issuanceRequestId || "");
    const { data: issuance, error } = await supabase
      .from("issuance_requests")
      .select("id,status,claim_token,failure_reason")
      .eq("id", issuanceRequestId)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    if (!issuance) {
      return res.status(404).json({ ok: false, error: "Issuance request not found" });
    }

    const claimUrl = issuance.claim_token ? buildClaimUrl(req, issuance.claim_token) : null;
    const showStatusPage = shouldShowStatusPageLink(elapsedSeconds);

    const statusPageToken = String(verified.payload?.statusPageToken || "");
    const statusPageUrl = `/api/embed/status-page?token=${encodeURIComponent(statusPageToken)}`;

    return res.status(200).json({
      ok: true,
      status: issuance.status,
      claimUrl,
      error: issuance.failure_reason || null,
      elapsedSeconds,
      nextPollSeconds: adaptivePollDelaySeconds(elapsedSeconds),
      showStatusPageLink: showStatusPage,
      statusPageUrl: showStatusPage ? statusPageUrl : null,
      timedOut: hasBackendTimedOut(elapsedSeconds),
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
