import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { getClientIp, getRequestContext } from "./security.js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ALLOWED_EVENT_TYPES = new Set([
  "claim_viewed",
  "claim_started",
  "pkpass_downloaded",
  "apple_wallet_added",
  "google_wallet_link_created",
  "google_wallet_saved",
  "claim_error",
]);

function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function hashIp(ip) {
  const salt = String(process.env.CLAIM_ANALYTICS_IP_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "")
    .slice(0, 64);
  return crypto.createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

function sanitizeMetadata(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  const pairs = Object.entries(metadata).slice(0, 20);
  const out = {};
  for (const [key, value] of pairs) {
    const safeKey = String(key).slice(0, 60);
    if (!safeKey) continue;
    if (value === null || value === undefined) continue;
    if (["string", "number", "boolean"].includes(typeof value)) {
      out[safeKey] = typeof value === "string" ? value.slice(0, 500) : value;
    }
  }
  return out;
}

export function isAllowedClaimEventType(eventType) {
  return ALLOWED_EVENT_TYPES.has(String(eventType || ""));
}

export async function trackClaimEvent(event) {
  const eventType = String(event?.eventType || "");
  if (!isAllowedClaimEventType(eventType)) return { ok: false, skipped: true, error: "invalid_event_type" };

  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, skipped: true, error: "missing_supabase_config" };

  const ip = String(event?.ip || "unknown").slice(0, 120);
  const payload = {
    event_type: eventType,
    claim_id: event?.claimId ? String(event.claimId).slice(0, 128) : null,
    pass_id: event?.passId ? String(event.passId) : null,
    event_id: event?.eventId ? String(event.eventId) : null,
    user_id: event?.userId ? String(event.userId) : null,
    ip_hash: hashIp(ip),
    ua: event?.ua ? String(event.ua).slice(0, 512) : null,
    metadata: sanitizeMetadata(event?.metadata),
  };

  const { error } = await supabase.from("claim_events").insert(payload);
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function trackClaimEventFromRequest(req, event) {
  const ctx = getRequestContext(req);
  return trackClaimEvent({
    ...event,
    ip: getClientIp(req),
    ua: ctx.userAgent,
    metadata: {
      ...(event?.metadata || {}),
      referrer: ctx.referrer,
      endpoint: event?.metadata?.endpoint || ctx.path,
      method: ctx.method,
    },
  });
}
