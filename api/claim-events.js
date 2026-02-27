import { readJsonBodyStrict, validateStringField } from "../lib/requestValidation.js";
import { isAllowedClaimEventType, trackClaimEventFromRequest } from "../lib/claimEvents.js";
import { limiters } from "../lib/rateLimit.js";
import { maybeLogSuspiciousRequest, sendRateLimitExceeded, setNoStore } from "../lib/security.js";
import {
  ensureShowfiContactCustomFields,
  ensureValidAccessTokenForLocation,
  updateGhlContactCustomFields,
} from "../lib/ghlOAuth.js";
import { getSupabaseAdmin } from "../lib/ghlIntegration.js";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function getIp(req) {
  return String(req?.headers?.["x-forwarded-for"] || req?.socket?.remoteAddress || "unknown")
    .split(",")[0]
    .trim();
}

function toIsoOrNull(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

async function maybePersistWalletAddWriteback(eventType, body) {
  const passId = typeof body?.passId === "string" ? body.passId.trim() : "";
  if (!passId) return;

  if (eventType !== "apple_wallet_added" && eventType !== "google_wallet_saved") return;
  const nowIso = new Date().toISOString();
  const supabase = getSupabaseAdmin();
  const walletAddedAt = toIsoOrNull(body?.metadata?.walletAddedAt) || nowIso;

  const { data: existing } = await supabase
    .from("pass_writeback_state")
    .select("pass_id,event_id,contact_id,location_id,pass_issued_at,join_click_first_at,join_click_latest_at,join_click_count")
    .eq("pass_id", passId)
    .maybeSingle();

  const payload = {
    pass_id: passId,
    event_id: typeof body?.eventId === "string" ? body.eventId : existing?.event_id || null,
    contact_id: existing?.contact_id || null,
    location_id: existing?.location_id || null,
    pass_issued_at: existing?.pass_issued_at || null,
    wallet_added_at: walletAddedAt,
    join_click_first_at: existing?.join_click_first_at || null,
    join_click_latest_at: existing?.join_click_latest_at || null,
    join_click_count: Number.isFinite(Number(existing?.join_click_count)) ? Number(existing.join_click_count) : 0,
    last_writeback_at: nowIso,
    updated_at: nowIso,
  };
  await supabase.from("pass_writeback_state").upsert(payload, { onConflict: "pass_id" });

  if (!existing?.contact_id || !existing?.location_id) return;
  const installation = await ensureValidAccessTokenForLocation({
    supabase,
    locationId: existing.location_id,
  });
  if (!installation?.access_token) return;

  await ensureShowfiContactCustomFields({
    accessToken: installation.access_token,
    locationId: existing.location_id,
    onError: (error, details) => {
      console.warn("[claim-events][ghl-writeback] custom field provisioning warning", {
        locationId: existing.location_id,
        phase: details?.phase,
        fieldKey: details?.fieldKey || null,
        error: error instanceof Error ? error.message : String(error),
      });
    },
  });
  await updateGhlContactCustomFields({
    accessToken: installation.access_token,
    contactId: existing.contact_id,
    locationId: existing.location_id,
    passIssuedAt: existing.pass_issued_at || "",
    walletAddedAt,
    joinClickFirstAt: existing.join_click_first_at || "",
    joinClickLatestAt: existing.join_click_latest_at || "",
    joinClickCount: Number.isFinite(Number(existing.join_click_count)) ? Number(existing.join_click_count) : 0,
  });
}

export default async function handler(req, res) {
  setCors(res);
  setNoStore(res);
  maybeLogSuspiciousRequest(req, { endpoint: "/api/claim-events" });

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method Not Allowed" });

  const ip = getIp(req);
  const ipLimit = limiters.generateByIp(ip);
  if (!ipLimit.allowed) {
    return sendRateLimitExceeded(res, ipLimit.retryAfterSeconds);
  }

  const parsedBody = await readJsonBodyStrict(req);
  if (!parsedBody.ok) {
    return res.status(parsedBody.status).json({ ok: false, error: parsedBody.error });
  }

  const body = parsedBody.body || {};
  const eventTypeValidation = validateStringField(body.eventType, {
    field: "eventType",
    required: true,
    min: 3,
    max: 64,
    pattern: /^[a-z_]+$/,
  });
  if (!eventTypeValidation.ok) {
    return res.status(400).json({ ok: false, error: eventTypeValidation.error });
  }

  if (!isAllowedClaimEventType(eventTypeValidation.value)) {
    return res.status(400).json({ ok: false, error: "Unsupported eventType" });
  }

  const tracked = await trackClaimEventFromRequest(req, {
    eventType: eventTypeValidation.value,
    claimId: typeof body.claimId === "string" ? body.claimId : null,
    passId: typeof body.passId === "string" ? body.passId : null,
    eventId: typeof body.eventId === "string" ? body.eventId : null,
    userId: typeof body.userId === "string" ? body.userId : null,
    metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {},
  });

  if (!tracked.ok && !tracked.skipped) {
    return res.status(500).json({ ok: false, error: tracked.error || "Failed to track event" });
  }

  try {
    await maybePersistWalletAddWriteback(eventTypeValidation.value, body);
  } catch (error) {
    console.warn("[claim-events] writeback warning (event tracking continues)", {
      error: error instanceof Error ? error.message : String(error),
    });
    // Keep analytics success path non-blocking for best-effort writebacks.
  }

  return res.status(200).json({ ok: true });
}
