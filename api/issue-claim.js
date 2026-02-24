import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { isValidEmail } from "../lib/requestValidation.js";
import { buildClaimUrl } from "../lib/baseUrl.js";
import { IssueClaimError, issueClaimTokenForRegistrant } from "../lib/issueClaimCore.js";
import { limiters } from "../lib/rateLimit.js";
import { getClientIp, maybeLogSuspiciousRequest, sendRateLimitExceeded, setNoStore } from "../lib/security.js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GHL_API_BASE_URL = "https://services.leadconnectorhq.com";
const GHL_API_VERSION = "2021-07-28";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-ghl-secret");
}

function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function secureEqual(left, right) {
  const leftBuf = Buffer.from(String(left || ""), "utf8");
  const rightBuf = Buffer.from(String(right || ""), "utf8");
  if (leftBuf.length === 0 || rightBuf.length === 0) return false;
  if (leftBuf.length !== rightBuf.length) return false;
  return crypto.timingSafeEqual(leftBuf, rightBuf);
}

function getHeader(req, name) {
  const direct = req?.headers?.[name];
  if (typeof direct === "string") return direct;
  const lower = req?.headers?.[name.toLowerCase()];
  if (typeof lower === "string") return lower;
  const upper = req?.headers?.[name.toUpperCase()];
  if (typeof upper === "string") return upper;
  return "";
}

function validateSecretHeader(req, expectedSecret) {
  const provided = String(getHeader(req, "x-ghl-secret") || "").trim();
  if (!provided) {
    return { ok: false, status: 401, error: "Missing x-ghl-secret" };
  }
  if (!secureEqual(provided, expectedSecret)) {
    return { ok: false, status: 403, error: "Invalid x-ghl-secret" };
  }
  return { ok: true, status: 200, error: "" };
}

function normalizeText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeOptionalText(value) {
  const normalized = normalizeText(value);
  return normalized || null;
}

function coerceOptionalId(value) {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized || "";
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return "";
}

function shouldDebugWebhookLogs() {
  const value = String(process.env.DEBUG_GHL_WEBHOOKS || "").trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

function maskEmail(value) {
  const email = normalizeText(value);
  if (!email || !email.includes("@")) return "";
  const [local, domain] = email.split("@");
  if (!domain) return "";
  const first = local.slice(0, 1);
  return `${first || "*"}***@${domain}`;
}

function maskPhone(value) {
  const phone = normalizeText(value);
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  const tail = digits.slice(-2);
  return `***${tail}`;
}

function getContentType(req) {
  const contentType = normalizeText(getHeader(req, "content-type")).toLowerCase();
  if (!contentType) return "";
  return contentType.split(";")[0].trim();
}

function parseBoundary(contentTypeHeader) {
  const match = String(contentTypeHeader || "").match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!match) return "";
  return (match[1] || match[2] || "").trim();
}

function parseMultipartFormData(rawText, contentTypeHeader) {
  const boundary = parseBoundary(contentTypeHeader);
  if (!boundary) {
    return { ok: false, status: 400, error: "Invalid multipart/form-data boundary" };
  }

  const parts = rawText.split(`--${boundary}`);
  const parsed = {};

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed || trimmed === "--") continue;
    const separatorIndex = part.indexOf("\r\n\r\n");
    if (separatorIndex < 0) continue;

    const headerSection = part.slice(0, separatorIndex);
    let valueSection = part.slice(separatorIndex + 4);
    valueSection = valueSection.replace(/\r\n$/, "");

    const nameMatch = headerSection.match(/name="([^"]+)"/i);
    if (!nameMatch?.[1]) continue;
    const fieldName = nameMatch[1].trim();
    if (!fieldName) continue;

    parsed[fieldName] = valueSection;
  }

  return { ok: true, body: parsed };
}

function maybeParseJsonString(value) {
  const text = normalizeText(value);
  if (!text) return null;
  if (!(text.startsWith("{") || text.startsWith("["))) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function maybeParseJsonContainer(value) {
  if (value && typeof value === "object") return value;
  const parsed = maybeParseJsonString(value);
  if (parsed && typeof parsed === "object") return parsed;
  return null;
}

async function readBodyWithContentType(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return {
      ok: true,
      body: req.body,
      rawLength: JSON.stringify(req.body).length,
      contentType: getContentType(req),
    };
  }

  const contentTypeHeader = normalizeText(getHeader(req, "content-type"));
  const contentType = contentTypeHeader.toLowerCase();
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const rawText = Buffer.concat(chunks).toString("utf8");
  const trimmed = rawText.trim();

  if (!trimmed) {
    return { ok: false, status: 400, error: "Request body is required", rawLength: 0, contentType };
  }

  if (contentType.includes("application/json")) {
    try {
      return { ok: true, body: JSON.parse(trimmed), rawLength: rawText.length, contentType };
    } catch {
      return { ok: false, status: 400, error: "Invalid JSON body", rawLength: rawText.length, contentType };
    }
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(trimmed);
    const body = Object.fromEntries(params.entries());
    return { ok: true, body, rawLength: rawText.length, contentType };
  }

  if (contentType.includes("multipart/form-data")) {
    const parsedMultipart = parseMultipartFormData(rawText, contentTypeHeader);
    if (!parsedMultipart.ok) {
      return { ...parsedMultipart, rawLength: rawText.length, contentType };
    }
    return { ok: true, body: parsedMultipart.body, rawLength: rawText.length, contentType };
  }

  // Fallback for providers that omit/incorrectly set content-type.
  const maybeJson = maybeParseJsonString(trimmed);
  if (maybeJson && typeof maybeJson === "object" && !Array.isArray(maybeJson)) {
    return { ok: true, body: maybeJson, rawLength: rawText.length, contentType };
  }
  const params = new URLSearchParams(trimmed);
  const body = Object.fromEntries(params.entries());
  if (Object.keys(body).length > 0) {
    return { ok: true, body, rawLength: rawText.length, contentType };
  }

  return { ok: false, status: 415, error: "Unsupported Content-Type", rawLength: rawText.length, contentType };
}

function asObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value;
}

function maskIdentifier(value) {
  const normalized = normalizeText(value);
  if (!normalized) return "";
  if (normalized.length <= 8) {
    return `${normalized.slice(0, 2)}...${normalized.slice(-2)}`;
  }
  return `${normalized.slice(0, 4)}...${normalized.slice(-4)}`;
}

function extractGhlContactContext(body) {
  const root = maybeParseJsonContainer(body);
  if (!root) return { contactId: "", locationId: "" };

  const stack = [root];
  const visited = new Set();
  let contactId = "";
  let locationId = "";

  while (stack.length && (!contactId || !locationId)) {
    const current = stack.pop();
    if (!current || (typeof current !== "object" && !Array.isArray(current))) continue;
    if (visited.has(current)) continue;
    visited.add(current);

    if (Array.isArray(current)) {
      for (const item of current) {
        const container = maybeParseJsonContainer(item);
        if (container) stack.push(container);
      }
      continue;
    }

    if (!contactId) {
      contactId = coerceOptionalId(current.contactId)
        || coerceOptionalId(asObject(current.contact)?.id);
    }
    if (!locationId) {
      locationId = coerceOptionalId(current.locationId)
        || coerceOptionalId(asObject(current.location)?.id);
    }

    for (const key of ["metadata", "customData", "custom_data", "payload", "data"]) {
      const nested = maybeParseJsonContainer(current[key]);
      if (nested) stack.push(nested);
    }

    for (const value of Object.values(current)) {
      const nested = maybeParseJsonContainer(value);
      if (nested) stack.push(nested);
    }
  }

  return { contactId, locationId };
}

async function writebackGhlContact({
  fetchImpl,
  contactId,
  locationId,
  claimUrl,
  claimToken,
  integrationKey,
}) {
  if (!fetchImpl || !contactId || !locationId || !integrationKey) {
    return { attempted: false, ok: false };
  }

  try {
    const response = await fetchImpl(`${GHL_API_BASE_URL}/contacts/${encodeURIComponent(contactId)}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${integrationKey}`,
        Version: GHL_API_VERSION,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        locationId,
        customFields: [
          { key: "contact.showfi_claim_url", field_value: claimUrl },
          { key: "contact.showfi_claim_token", field_value: claimToken },
        ],
      }),
    });

    return {
      attempted: true,
      ok: response.ok,
      status: Number.isFinite(response.status) ? response.status : undefined,
    };
  } catch {
    return { attempted: true, ok: false };
  }
}

function findValueInSources(sources, keys) {
  for (const source of sources) {
    if (!source) continue;
    for (const key of keys) {
      if (typeof source[key] === "string" || typeof source[key] === "number") {
        return String(source[key]);
      }
    }
  }
  return "";
}

function normalizeIncomingBody(body) {
  const root = asObject(body);
  if (!root) return null;

  const maybeCustomData = asObject(root.customData) || asObject(maybeParseJsonString(root.customData));
  const maybeCustomDataSnake = asObject(root.custom_data) || asObject(maybeParseJsonString(root.custom_data));
  const maybeData = asObject(root.data);
  const maybePayload = asObject(root.payload);
  const maybeBody = asObject(root.body);
  const maybeContact = asObject(root.contact);

  const sources = [
    root,
    maybeCustomData,
    maybeCustomDataSnake,
    maybeData,
    maybePayload,
    maybeBody,
    maybeContact,
    asObject(maybeContact?.customData),
    asObject(maybeContact?.custom_data),
  ];

  const eventId = normalizeText(findValueInSources(sources, ["eventId", "eventID", "event_id", "EventId", "EVENT_ID"]));
  const name = normalizeText(findValueInSources(sources, ["name", "fullName", "full_name"]));
  const email = normalizeText(findValueInSources(sources, ["email", "emailAddress", "email_address", "contactEmail", "contact_email"])).toLowerCase();
  const phone = normalizeOptionalText(findValueInSources(sources, ["phone", "phoneNumber", "phone_number"]));

  let metadata = asObject(root.metadata)
    || asObject(root.meta)
    || asObject(maybeCustomData?.metadata)
    || asObject(maybeCustomDataSnake?.metadata)
    || null;
  if (!metadata) {
    const parsedMetadata = maybeParseJsonString(root.metadata);
    if (asObject(parsedMetadata)) metadata = parsedMetadata;
  }

  return { eventId, name, email, phone, metadata };
}

function validateBody(body) {
  const normalized = normalizeIncomingBody(body);
  if (!normalized) {
    return { ok: false, error: "Invalid body", fields: [] };
  }

  const fields = [];

  if (!normalized.eventId) fields.push("eventId");
  if (!normalized.email) fields.push("email");
  if (normalized.email && !isValidEmail(normalized.email)) fields.push("email (invalid)");
  if (normalized.metadata !== undefined && normalized.metadata !== null && (typeof normalized.metadata !== "object" || Array.isArray(normalized.metadata))) {
    fields.push("metadata (must be object)");
  }

  if (fields.length) {
    return { ok: false, error: "Invalid fields", fields };
  }

  return {
    ok: true,
    data: {
      eventId: normalized.eventId,
      name: normalized.name,
      email: normalized.email,
      phone: normalized.phone,
      metadata: normalized.metadata || null,
    },
  };
}

function debugLogWebhookRequest(req, body, rawLength, contentType) {
  if (!shouldDebugWebhookLogs()) return;
  const keys = body && typeof body === "object" && !Array.isArray(body) ? Object.keys(body).slice(0, 30) : [];
  const normalized = normalizeIncomingBody(body);
  console.log("[issue-claim][debug]", {
    contentType: contentType || getContentType(req) || "(empty)",
    rawBodyLength: Number.isFinite(rawLength) ? rawLength : 0,
    parsedBodyKeys: keys,
    eventIdPresent: Boolean(normalized?.eventId),
    email: maskEmail(normalized?.email),
    phone: maskPhone(normalized?.phone),
  });
}

function enforceRateLimit(req, res) {
  const byIp = limiters.generateByIp(getClientIp(req));
  if (!byIp.allowed) {
    sendRateLimitExceeded(res, byIp.retryAfterSeconds);
    return false;
  }
  return true;
}

export function createIssueClaimHandler(deps = {}) {
  const getSupabase = deps.getSupabaseAdmin || getSupabaseAdmin;
  const issueClaim = deps.issueClaim || issueClaimTokenForRegistrant;
  const fetchImpl = deps.fetchImpl || globalThis.fetch?.bind(globalThis);

  return async function issueClaimHandler(req, res) {
    setCors(res);
    if (req.method === "OPTIONS") return res.status(204).end();
    setNoStore(res);
    maybeLogSuspiciousRequest(req, { endpoint: "/api/issue-claim" });

    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method Not Allowed" });
    }

    if (!enforceRateLimit(req, res)) return;

    const secret = String(process.env.GHL_PASS_SECRET || "").trim();
    if (!secret) {
      return res.status(500).json({ ok: false, error: "MISSING_GHL_PASS_SECRET" });
    }

    const auth = validateSecretHeader(req, secret);
    if (!auth.ok) {
      return res.status(auth.status).json({ ok: false, error: auth.error });
    }

    const parsedBody = await readBodyWithContentType(req);
    debugLogWebhookRequest(req, parsedBody.body, parsedBody.rawLength, parsedBody.contentType);
    if (!parsedBody.ok) {
      return res.status(parsedBody.status).json({ ok: false, error: parsedBody.error });
    }

    const validBody = validateBody(parsedBody.body);
    if (!validBody.ok) {
      return res.status(400).json({ ok: false, error: validBody.error, fields: validBody.fields });
    }

    try {
      const supabase = getSupabase();
      const data = validBody.data;
      const issued = await issueClaim(supabase, data);
      const claimUrl = buildClaimUrl(req, issued.claimToken);
      const { contactId, locationId } = extractGhlContactContext(parsedBody.body);
      const integrationKey = normalizeText(process.env.GHL_PRIVATE_INTEGRATION_KEY || "");
      const ghlWriteback = await writebackGhlContact({
        fetchImpl,
        contactId,
        locationId,
        claimUrl,
        claimToken: issued.claimToken,
        integrationKey,
      });

      if (shouldDebugWebhookLogs()) {
        console.log("[issue-claim][debug][ghl-writeback]", {
          contactId: maskIdentifier(contactId),
          locationId: maskIdentifier(locationId),
          attempted: ghlWriteback.attempted,
          ok: ghlWriteback.ok,
          status: Number.isFinite(ghlWriteback.status) ? ghlWriteback.status : undefined,
        });
      }

      const responseBody = {
        ok: true,
        claimUrl,
        claimToken: issued.claimToken,
        eventId: issued.eventId,
        registrantId: issued.registrantId,
      };
      if (shouldDebugWebhookLogs()) {
        responseBody.ghlWriteback = {
          attempted: ghlWriteback.attempted,
          ok: ghlWriteback.ok,
          ...(Number.isFinite(ghlWriteback.status) ? { status: ghlWriteback.status } : {}),
        };
      }

      return res.status(200).json(responseBody);
    } catch (error) {
      if (error instanceof IssueClaimError) {
        return res.status(error.status).json({ ok: false, error: error.message });
      }
      if (Number.isInteger(error?.status) && error.status >= 400 && error.status < 600) {
        return res.status(error.status).json({ ok: false, error: error.message || String(error) });
      }
      return res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };
}

export default createIssueClaimHandler();
