import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { readJsonBodyStrict, isValidEmail } from "../lib/requestValidation.js";
import { createPassWithUniqueToken } from "../lib/claimToken.js";
import { limiters } from "../lib/rateLimit.js";
import { getClientIp, maybeLogSuspiciousRequest, sendRateLimitExceeded, setNoStore } from "../lib/security.js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-ghl-secret");
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

function normalizeSource(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return "issue-claim";
  }
  const source = typeof metadata.source === "string" ? metadata.source.trim() : "";
  return source || "issue-claim";
}

function validateBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Invalid JSON body", fields: [] };
  }

  const eventId = normalizeText(body.eventId);
  const name = normalizeText(body.name);
  const email = normalizeText(body.email).toLowerCase();
  const phone = normalizeOptionalText(body.phone);
  const metadata = body.metadata;
  const fields = [];

  if (!eventId) fields.push("eventId");
  if (!email) fields.push("email");
  if (email && !isValidEmail(email)) fields.push("email (invalid)");
  if (metadata !== undefined && (typeof metadata !== "object" || metadata === null || Array.isArray(metadata))) {
    fields.push("metadata (must be object)");
  }

  if (fields.length) {
    return { ok: false, error: "Invalid fields", fields };
  }

  return {
    ok: true,
    data: {
      eventId,
      name,
      email,
      phone,
      metadata: metadata || null,
    },
  };
}

async function requireEvent(supabase, eventId) {
  const { data, error } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .limit(1)
    .maybeSingle();

  if (error) return { event: null, error: error.message, status: 500 };
  if (!data) return { event: null, error: "Event not found", status: 404 };
  return { event: data, error: null, status: 200 };
}

async function upsertRegistrant(supabase, input) {
  const { data: existing, error: selectError } = await supabase
    .from("registrants")
    .select("id")
    .eq("event_id", input.eventId)
    .eq("email", input.email)
    .limit(1)
    .maybeSingle();

  if (selectError) {
    return { registrant: null, error: selectError.message };
  }

  const source = normalizeSource(input.metadata);

  if (existing?.id) {
    const updatePayload = {
      source,
    };
    if (input.name) updatePayload.name = input.name;
    updatePayload.phone = input.phone;

    const { data: updated, error: updateError } = await supabase
      .from("registrants")
      .update(updatePayload)
      .eq("id", existing.id)
      .select("id")
      .single();

    if (updateError) return { registrant: null, error: updateError.message };
    return { registrant: updated, error: null };
  }

  const insertPayload = {
    event_id: input.eventId,
    email: input.email,
    name: input.name || input.email,
    phone: input.phone,
    source,
  };

  const { data: created, error: createError } = await supabase
    .from("registrants")
    .insert(insertPayload)
    .select("id")
    .single();

  if (createError) return { registrant: null, error: createError.message };
  return { registrant: created, error: null };
}

async function findReusablePass(supabase, eventId, registrantId) {
  const { data, error } = await supabase
    .from("passes")
    .select("id,claim_token,claimed_at")
    .eq("event_id", eventId)
    .eq("registrant_id", registrantId)
    .is("claimed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { pass: null, error: error.message };
  return { pass: data || null, error: null };
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
  const verifyEvent = deps.requireEvent || requireEvent;
  const upsert = deps.upsertRegistrant || upsertRegistrant;
  const findPass = deps.findReusablePass || findReusablePass;
  const createPass = deps.createPassWithUniqueToken || createPassWithUniqueToken;

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

    const parsedBody = await readJsonBodyStrict(req);
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

      const eventResult = await verifyEvent(supabase, data.eventId);
      if (!eventResult.event) {
        return res.status(eventResult.status || 500).json({ ok: false, error: eventResult.error || "Event lookup failed" });
      }

      const registrantResult = await upsert(supabase, data);
      if (!registrantResult.registrant?.id) {
        return res.status(500).json({ ok: false, error: registrantResult.error || "Failed to upsert registrant" });
      }

      const reusable = await findPass(supabase, data.eventId, registrantResult.registrant.id);
      if (reusable.error) {
        return res.status(500).json({ ok: false, error: reusable.error });
      }

      let pass = reusable.pass;
      if (!pass?.claim_token) {
        const createdPass = await createPass(supabase, data.eventId, registrantResult.registrant.id);
        if (createdPass.error || !createdPass.pass?.claim_token) {
          return res.status(500).json({ ok: false, error: createdPass.error?.message || createdPass.error || "Failed to create claim token" });
        }
        pass = createdPass.pass;
      }

      const baseUrl = getBaseUrl(req);
      const claimPath = `/claim/${encodeURIComponent(pass.claim_token)}`;
      const claimUrl = baseUrl ? `${baseUrl}${claimPath}` : claimPath;

      return res.status(200).json({
        ok: true,
        claimUrl,
        claimToken: pass.claim_token,
        eventId: data.eventId,
        registrantId: registrantResult.registrant.id,
      });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };
}

export default createIssueClaimHandler();
