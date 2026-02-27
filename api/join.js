import { verifySignedToken } from "../lib/token.js";
import { mergeJoinClickMetrics } from "../lib/walletOps.js";
import {
  ensureShowfiContactCustomFields,
  ensureValidAccessTokenForLocation,
  updateGhlContactCustomFields,
} from "../lib/ghlOAuth.js";
import { getSupabaseAdmin } from "../lib/ghlIntegration.js";

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

async function persistJoinClickMetrics(payload) {
  const passId = payload?.passId ? String(payload.passId).trim() : "";
  if (!passId) return;

  const supabase = getSupabaseAdmin();
  const nowIso = new Date().toISOString();
  const { data: existing } = await supabase
    .from("pass_writeback_state")
    .select("pass_id,event_id,contact_id,location_id,pass_issued_at,wallet_added_at,join_click_first_at,join_click_latest_at,join_click_count")
    .eq("pass_id", passId)
    .maybeSingle();

  const merged = mergeJoinClickMetrics({
    first_at: existing?.join_click_first_at || "",
    latest_at: existing?.join_click_latest_at || "",
    count: existing?.join_click_count || 0,
  }, nowIso);

  const writebackPayload = {
    pass_id: passId,
    event_id: payload?.eventId ? String(payload.eventId).trim() : existing?.event_id || null,
    contact_id: payload?.contactId ? String(payload.contactId).trim() : existing?.contact_id || null,
    location_id: payload?.locationId ? String(payload.locationId).trim() : existing?.location_id || null,
    pass_issued_at: existing?.pass_issued_at || null,
    wallet_added_at: existing?.wallet_added_at || null,
    join_click_first_at: merged.first_at,
    join_click_latest_at: merged.latest_at,
    join_click_count: merged.count,
    last_writeback_at: nowIso,
    updated_at: nowIso,
  };

  await supabase.from("pass_writeback_state").upsert(writebackPayload, { onConflict: "pass_id" });

  if (!writebackPayload.contact_id || !writebackPayload.location_id) return;
  const installation = await ensureValidAccessTokenForLocation({
    supabase,
    locationId: writebackPayload.location_id,
  });
  if (!installation?.access_token) return;

  await ensureShowfiContactCustomFields({
    accessToken: installation.access_token,
    locationId: writebackPayload.location_id,
    onError: (error, details) => {
      console.warn("[join][ghl-writeback] custom field provisioning warning", {
        locationId: writebackPayload.location_id,
        phase: details?.phase,
        fieldKey: details?.fieldKey || null,
        error: error instanceof Error ? error.message : String(error),
      });
    },
  });
  await updateGhlContactCustomFields({
    accessToken: installation.access_token,
    contactId: writebackPayload.contact_id,
    locationId: writebackPayload.location_id,
    passIssuedAt: writebackPayload.pass_issued_at || "",
    walletAddedAt: writebackPayload.wallet_added_at || "",
    joinClickFirstAt: writebackPayload.join_click_first_at || "",
    joinClickLatestAt: writebackPayload.join_click_latest_at || "",
    joinClickCount: writebackPayload.join_click_count || 0,
  });
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

  try {
    await persistJoinClickMetrics(verified.payload || {});
  } catch (error) {
    console.warn("[join] writeback warning (continuing redirect)", {
      error: error instanceof Error ? error.message : String(error),
    });
    // Join redirect must remain highly available even if analytics/writeback fails.
  }

  res.statusCode = 302;
  res.setHeader("Location", joinUrl);
  return res.end();
}
