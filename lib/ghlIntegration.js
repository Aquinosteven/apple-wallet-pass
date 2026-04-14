import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { buildClaimUrl } from "./baseUrl.js";
import { issueClaimTokenForRegistrant } from "./issueClaimCore.js";
import { getEnv, loadLocalEnvFiles } from "../scripts/env-loader.js";

const GHL_API_BASE_URL = "https://services.leadconnectorhq.com";
const GHL_API_VERSION = "2021-07-28";

export const SHOWFI_CUSTOM_FIELDS = [
  "showfi_claim_url",
  "showfi_apple_wallet_url",
  "showfi_google_wallet_url",
  "showfi_pass_id",
  "showfi_status",
  "showfi_last_error",
];

function isMissingRelationError(error) {
  const message = String(error?.message || "").toLowerCase();
  const details = String(error?.details || "").toLowerCase();
  return message.includes("does not exist")
    || message.includes("could not find the table")
    || details.includes("does not exist");
}

function normalizeText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function safeString(value) {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

export function getSupabaseAdmin() {
  loadLocalEnvFiles();
  const supabaseUrl = getEnv("SUPABASE_URL", ["VITE_SUPABASE_URL"]);
  const supabaseServiceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getEncryptionSecret() {
  loadLocalEnvFiles();
  const raw = normalizeText(
    process.env.GHL_API_KEY_ENCRYPTION_SECRET
      || process.env.INTEGRATION_ENCRYPTION_SECRET
      || process.env.SUPABASE_SERVICE_ROLE_KEY
      || ""
  );
  if (!raw) throw new Error("Missing encryption secret");
  return crypto.createHash("sha256").update(raw).digest();
}

export function encryptApiKey(plain) {
  const value = normalizeText(plain);
  if (!value) throw new Error("API key is required");

  const key = getEncryptionSecret();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptApiKey(payload) {
  const encoded = normalizeText(payload);
  const parts = encoded.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted API key format");

  const iv = Buffer.from(parts[0], "base64");
  const authTag = Buffer.from(parts[1], "base64");
  const encrypted = Buffer.from(parts[2], "base64");

  const key = getEncryptionSecret();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

function ghlHeaders(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`,
    Version: GHL_API_VERSION,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

function parseLocationFromPayload(payload) {
  const root = payload && typeof payload === "object" ? payload : {};
  const candidates = [
    root?.location,
    root?.data?.location,
    Array.isArray(root?.locations) ? root.locations[0] : null,
    Array.isArray(root?.data?.locations) ? root.data.locations[0] : null,
    Array.isArray(root?.data) ? root.data[0] : null,
    root,
  ];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue;
    const locationId = normalizeText(safeString(candidate.id || candidate.locationId));
    if (locationId) return locationId;
  }

  return "";
}

export async function verifyLocationApiKey(apiKey, fetchImpl = globalThis.fetch?.bind(globalThis)) {
  if (!fetchImpl) throw new Error("Fetch is not available");

  const response = await fetchImpl(`${GHL_API_BASE_URL}/locations/search?limit=1`, {
    method: "GET",
    headers: ghlHeaders(apiKey),
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = normalizeText(payload?.message)
      || normalizeText(payload?.error)
      || `GHL verification failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return {
    ok: true,
    status: response.status,
    locationId: parseLocationFromPayload(payload) || null,
  };
}

export async function getGhlIntegrationByUserId(supabase, userId) {
  const { data, error } = await supabase
    .from("integrations_ghl")
    .select("id,user_id,location_id,default_event_id,api_key_encrypted,api_key_last4,verified_at,last_webhook_at,last_error,created_at,updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) return null;
    throw new Error(error.message || "Failed to load GHL integration");
  }
  return data || null;
}

export async function getWorkspaceGhlIntegrationByAccountId(supabase, accountId) {
  const normalized = normalizeText(accountId);
  if (!normalized) return null;

  const { data, error } = await supabase
    .from("workspace_integrations_ghl")
    .select("id,account_id,legacy_integration_id,location_id,default_event_id,api_key_encrypted,api_key_last4,verified_at,last_webhook_at,last_error,metadata,created_at,updated_at")
    .eq("account_id", normalized)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) return null;
    throw new Error(error.message || "Failed to load workspace GHL integration");
  }

  return data || null;
}

export async function getGhlIntegrationByLocationId(supabase, locationId) {
  const normalized = normalizeText(locationId);
  if (!normalized) return null;

  const workspaceIntegration = await (async () => {
    const { data, error } = await supabase
      .from("workspace_integrations_ghl")
      .select("id,account_id,legacy_integration_id,location_id,default_event_id,api_key_encrypted,api_key_last4,verified_at,last_webhook_at,last_error,metadata,created_at,updated_at")
      .eq("location_id", normalized)
      .maybeSingle();

    if (error) {
      if (isMissingRelationError(error)) return null;
      throw new Error(error.message || "Failed to load workspace GHL integration");
    }
    return data || null;
  })();

  if (workspaceIntegration) {
    return workspaceIntegration;
  }

  const { data, error } = await supabase
    .from("integrations_ghl")
    .select("id,user_id,location_id,default_event_id,api_key_encrypted,api_key_last4,verified_at,last_webhook_at,last_error,created_at,updated_at")
    .eq("location_id", normalized)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) return null;
    throw new Error(error.message || "Failed to load GHL integration");
  }
  return data || null;
}

export async function upsertGhlIntegrationForUser(supabase, { userId, apiKey, locationId = null, verifiedAt = null, defaultEventId = null }) {
  const encrypted = encryptApiKey(apiKey);
  const last4 = normalizeText(apiKey).slice(-4).padStart(4, "*");

  const payload = {
    user_id: userId,
    api_key_encrypted: encrypted,
    api_key_last4: last4,
    location_id: locationId || null,
    verified_at: verifiedAt,
    default_event_id: defaultEventId,
    ...(verifiedAt ? { last_error: null } : {}),
  };

  const { data, error } = await supabase
    .from("integrations_ghl")
    .upsert(payload, { onConflict: "user_id" })
    .select("id,user_id,location_id,default_event_id,api_key_last4,verified_at,last_webhook_at,last_error,created_at,updated_at")
    .single();

  if (error) throw new Error(error.message || "Failed to save GHL integration");
  return data;
}

export async function upsertWorkspaceGhlIntegration(supabase, {
  accountId,
  apiKey,
  locationId = null,
  verifiedAt = null,
  defaultEventId = null,
  legacyIntegrationId = null,
}) {
  const encrypted = encryptApiKey(apiKey);
  const last4 = normalizeText(apiKey).slice(-4).padStart(4, "*");

  const payload = {
    account_id: accountId,
    legacy_integration_id: legacyIntegrationId,
    api_key_encrypted: encrypted,
    api_key_last4: last4,
    location_id: locationId || null,
    verified_at: verifiedAt,
    default_event_id: defaultEventId,
    ...(verifiedAt ? { last_error: null } : {}),
  };

  const { data, error } = await supabase
    .from("workspace_integrations_ghl")
    .upsert(payload, { onConflict: "account_id" })
    .select("id,account_id,legacy_integration_id,location_id,default_event_id,api_key_last4,verified_at,last_webhook_at,last_error,metadata,created_at,updated_at")
    .single();

  if (error) {
    if (isMissingRelationError(error)) {
      return null;
    }
    throw new Error(error.message || "Failed to save workspace GHL integration");
  }

  return data;
}

async function ghlRequest(fetchImpl, apiKey, path, init = {}) {
  const response = await fetchImpl(`${GHL_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...ghlHeaders(apiKey),
      ...(init.headers || {}),
    },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = normalizeText(payload?.message)
      || normalizeText(payload?.error)
      || `GHL API request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return payload;
}

function parseContact(payload) {
  const root = payload && typeof payload === "object" ? payload : {};
  const candidates = [
    root?.contact,
    root?.data?.contact,
    root?.data,
    Array.isArray(root?.contacts) ? root.contacts[0] : null,
    root,
  ];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue;
    const email = normalizeText(safeString(candidate.email));
    const id = normalizeText(safeString(candidate.id || candidate.contactId));
    if (!id && !email) continue;

    return {
      id,
      email,
      name: normalizeText(safeString(candidate.name || candidate.firstName || candidate.fullName || "")),
      phone: normalizeText(safeString(candidate.phone || candidate.phoneNumber || "")) || null,
    };
  }

  return null;
}

export async function fetchContactById({ fetchImpl, apiKey, contactId }) {
  const payload = await ghlRequest(fetchImpl, apiKey, `/contacts/${encodeURIComponent(contactId)}`, {
    method: "GET",
  });

  const contact = parseContact(payload);
  if (!contact?.email) {
    throw new Error("Contact is missing email in GHL");
  }

  return contact;
}

function toCustomFieldPayload(values) {
  return Object.entries(values).map(([key, value]) => ({
    key: `contact.${key}`,
    field_value: value == null ? "" : String(value),
  }));
}

export async function writeShowfiFieldsToContact({
  fetchImpl,
  apiKey,
  contactId,
  locationId,
  fields,
}) {
  const payload = {
    locationId,
    customFields: toCustomFieldPayload(fields),
  };

  await ghlRequest(fetchImpl, apiKey, `/contacts/${encodeURIComponent(contactId)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  return { ok: true };
}

function pickEventId(payloadEventId, integration) {
  const explicit = normalizeText(payloadEventId);
  if (explicit) return explicit;

  const configured = normalizeText(safeString(integration?.default_event_id));
  if (configured) return configured;

  return "";
}

async function pickLatestEventIdForUser(supabase, userId) {
  const { data, error } = await supabase
    .from("events")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message || "Failed to resolve event");
  return data?.id ? String(data.id) : "";
}

async function pickLatestEventIdForAccount(supabase, accountId) {
  const { data, error } = await supabase
    .from("events")
    .select("id")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message || "Failed to resolve workspace event");
  return data?.id ? String(data.id) : "";
}

export function buildWalletLinks(req, claimToken) {
  const claimUrl = buildClaimUrl(req, claimToken);
  return {
    claimUrl,
    appleWalletUrl: claimUrl,
    googleWalletUrl: claimUrl,
  };
}

export function makeIdempotencyKey({ contactId, eventId, tag }) {
  const contact = normalizeText(contactId);
  if (!contact) return "";

  const event = normalizeText(eventId);
  if (event) return `${contact}:${event}`;

  const normalizedTag = normalizeText(tag);
  if (normalizedTag) return `${contact}:${normalizedTag}`;

  return contact;
}

export async function insertWebhookLog(supabase, payload) {
  const { data, error } = await supabase
    .from("ghl_webhook_logs")
    .insert(payload)
    .select("id,user_id,integration_id,processing_status,webhook_received,pass_created,claim_link_created,ghl_writeback_ok,error_message,created_at")
    .single();

  if (error) {
    const wrapped = new Error(error.message || "Failed to insert webhook log");
    wrapped.code = error.code;
    throw wrapped;
  }

  return data;
}

export async function updateWebhookLog(supabase, logId, payload) {
  const { error } = await supabase
    .from("ghl_webhook_logs")
    .update(payload)
    .eq("id", logId);

  if (error) throw new Error(error.message || "Failed to update webhook log");
}

export async function findWebhookLogByIdempotencyKey(supabase, key) {
  const normalized = normalizeText(key);
  if (!normalized) return null;

  const { data, error } = await supabase
    .from("ghl_webhook_logs")
    .select("id,user_id,integration_id,processing_status,webhook_received,pass_created,claim_link_created,ghl_writeback_ok,error_message,created_at")
    .eq("idempotency_key", normalized)
    .maybeSingle();

  if (error) throw new Error(error.message || "Failed to lookup webhook log");
  return data || null;
}

export async function runGhlIssueFlow({
  supabase,
  req,
  integration,
  contactId,
  locationId,
  tag,
  payloadEventId,
  fetchImpl = globalThis.fetch?.bind(globalThis),
  selfTest = false,
}) {
  if (!fetchImpl) throw new Error("Fetch is not available");

  const apiKey = decryptApiKey(integration.api_key_encrypted);
  const eventId = pickEventId(payloadEventId, integration)
    || (integration.account_id ? await pickLatestEventIdForAccount(supabase, integration.account_id) : "")
    || (integration.user_id ? await pickLatestEventIdForUser(supabase, integration.user_id) : "");

  if (!eventId) {
    throw new Error("No event found. Create an event in ShowFi before testing the webhook.");
  }

  let contact;
  if (contactId) {
    contact = await fetchContactById({ fetchImpl, apiKey, contactId });
  } else {
    const syntheticSuffix = Date.now();
    contact = {
      id: "",
      email: `selftest+${syntheticSuffix}@showfi.local`,
      name: "ShowFi Self Test",
      phone: null,
    };
  }

  const issued = await issueClaimTokenForRegistrant(supabase, {
    eventId,
    email: contact.email,
    name: contact.name || contact.email,
    phone: contact.phone,
    metadata: {
      source: selfTest ? "ghl-self-test" : "ghl-webhook",
      locationId,
      contactId,
      tag,
    },
  });

  const walletLinks = buildWalletLinks(req, issued.claimToken);

  let writeback = {
    attempted: false,
    ok: false,
    error: "No contactId provided. Skipped write-back.",
  };

  if (contactId && locationId) {
    try {
      await writeShowfiFieldsToContact({
        fetchImpl,
        apiKey,
        contactId,
        locationId,
        fields: {
          showfi_claim_url: walletLinks.claimUrl,
          showfi_apple_wallet_url: walletLinks.appleWalletUrl,
          showfi_google_wallet_url: walletLinks.googleWalletUrl,
          showfi_pass_id: issued.passId,
          showfi_status: "ready",
          showfi_last_error: "",
        },
      });

      writeback = { attempted: true, ok: true, error: "" };
    } catch (error) {
      writeback = {
        attempted: true,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  return {
    eventId,
    issued,
    walletLinks,
    writeback,
  };
}
