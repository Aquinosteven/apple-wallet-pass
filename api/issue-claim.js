import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { readJsonBodyStrict, isValidEmail } from "../lib/requestValidation.js";
import { buildClaimUrl } from "../lib/baseUrl.js";
import { IssueClaimError, issueClaimTokenForRegistrant } from "../lib/issueClaimCore.js";
import { limiters } from "../lib/rateLimit.js";
import { getClientIp, maybeLogSuspiciousRequest, sendRateLimitExceeded, setNoStore } from "../lib/security.js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
      const issued = await issueClaim(supabase, data);
      const claimUrl = buildClaimUrl(req, issued.claimToken);

      return res.status(200).json({
        ok: true,
        claimUrl,
        claimToken: issued.claimToken,
        eventId: issued.eventId,
        registrantId: issued.registrantId,
      });
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
