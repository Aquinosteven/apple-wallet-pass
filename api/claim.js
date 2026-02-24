import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { generateApplePass } from "../lib/generatePass.js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;

  const contentType = String(req.headers["content-type"] || "").toLowerCase();
  if (!contentType.includes("application/json")) return null;

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getTokenFromRequest(req) {
  if (req.method === "GET") {
    const token = typeof req.query?.token === "string" ? req.query.token.trim() : "";
    return token;
  }

  return "";
}

function getTokenFromBody(body) {
  if (!body || typeof body !== "object") return "";
  return typeof body.token === "string" ? body.token.trim() : "";
}

function validateTokenOrError(token) {
  if (!token) return "token is required";
  if (token.length < 64) return "token is invalid";
  if (!/^[a-f0-9]+$/i.test(token)) return "token is invalid";
  return null;
}

function mapClaimPreview(row) {
  return {
    event: {
      title: row.event.name,
      date: row.event.starts_at,
    },
    registrant: {
      name: row.registrant.name,
      email: row.registrant.email,
    },
  };
}

async function fetchClaimRowByToken(supabase, token) {
  const { data, error } = await supabase
    .from("passes")
    .select(
      "id,claim_token,claimed_at,apple_serial_number,event:events!passes_event_id_fkey(name,starts_at),registrant:registrants!passes_registrant_id_fkey(name,email,phone)"
    )
    .eq("claim_token", token)
    .limit(1)
    .maybeSingle();

  if (error) {
    return { row: null, error: error.message };
  }

  return { row: data, error: null };
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

function createAppleSerial() {
  return crypto.randomBytes(32).toString("hex");
}

async function getSerialByPassId(supabase, passId) {
  const { data, error } = await supabase
    .from("passes")
    .select("apple_serial_number")
    .eq("id", passId)
    .limit(1)
    .maybeSingle();
  if (error) return { serial: null, error: error.message };
  return { serial: data?.apple_serial_number || null, error: null };
}

async function ensureAppleSerial(supabase, passId, existingSerial) {
  if (existingSerial) return { serial: existingSerial, error: null };

  const maxAttempts = 3;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const serial = createAppleSerial();
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("passes")
      .update({
        apple_serial_number: serial,
        last_updated_at: nowIso,
      })
      .eq("id", passId)
      .is("apple_serial_number", null)
      .select("apple_serial_number")
      .limit(1)
      .maybeSingle();

    if (!error && data?.apple_serial_number) {
      return { serial: data.apple_serial_number, error: null };
    }

    if (error && error.code !== "23505") {
      return { serial: null, error: error.message };
    }

    const current = await getSerialByPassId(supabase, passId);
    if (current.error) return { serial: null, error: current.error };
    if (current.serial) return { serial: current.serial, error: null };
  }

  return { serial: null, error: "Unable to assign apple serial number" };
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (![
    "GET",
    "POST",
  ].includes(req.method || "")) {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const supabase = getSupabaseAdmin();

    if (req.method === "GET") {
      const token = getTokenFromRequest(req);
      const tokenError = validateTokenOrError(token);
      if (tokenError) {
        return res.status(400).json({ ok: false, error: tokenError });
      }

      const { row, error } = await fetchClaimRowByToken(supabase, token);
      if (error) {
        return res.status(500).json({ ok: false, error });
      }

      if (!row || !row.event || !row.registrant) {
        return res.status(404).json({ ok: false, error: "Claim token not found" });
      }

      if (row.claimed_at) {
        return res.status(409).json({ ok: false, error: "Claim token has already been used" });
      }

      return res.status(200).json({
        ok: true,
        claim: mapClaimPreview(row),
      });
    }

    const body = await readJsonBody(req);
    if (!body || typeof body !== "object") {
      return res.status(400).json({ ok: false, error: "Invalid JSON body" });
    }

    const token = getTokenFromBody(body);
    const tokenError = validateTokenOrError(token);
    if (tokenError) {
      return res.status(400).json({ ok: false, error: tokenError });
    }

    const fetched = await fetchClaimRowByToken(supabase, token);
    if (fetched.error) {
      return res.status(500).json({ ok: false, error: fetched.error });
    }
    if (!fetched.row || !fetched.row.event || !fetched.row.registrant) {
      return res.status(404).json({ ok: false, error: "Claim token not found" });
    }

    let claimRow = fetched.row;
    if (!claimRow.claimed_at) {
      const nowIso = new Date().toISOString();
      const { data: claimedPass, error: claimError } = await supabase
        .from("passes")
        .update({
          claimed_at: nowIso,
          last_updated_at: nowIso,
        })
        .eq("id", claimRow.id)
        .is("claimed_at", null)
        .select("claimed_at")
        .limit(1)
        .maybeSingle();

      if (claimError) {
        return res.status(500).json({ ok: false, error: claimError.message });
      }
      if (claimedPass?.claimed_at) {
        claimRow = { ...claimRow, claimed_at: claimedPass.claimed_at };
      }
    }

    const serialResult = await ensureAppleSerial(supabase, claimRow.id, claimRow.apple_serial_number);
    if (serialResult.error || !serialResult.serial) {
      return res.status(500).json({ ok: false, error: serialResult.error || "Missing apple serial number" });
    }

    const baseUrl = getBaseUrl(req);
    const claimUrl = baseUrl
      ? new URL(`/claim/${encodeURIComponent(token)}`, baseUrl).toString()
      : "";

    const { pkpassBuffer } = await generateApplePass({
      attendeeName: claimRow.registrant.name,
      attendeeEmail: claimRow.registrant.email,
      attendeePhone: claimRow.registrant.phone || "",
      eventTitle: claimRow.event.name,
      startsAt: claimRow.event.starts_at,
      joinUrl: claimUrl,
      serialNumber: serialResult.serial,
    });

    res.setHeader("Content-Type", "application/vnd.apple.pkpass");
    res.setHeader("Content-Disposition", "attachment; filename=\"event.pkpass\"");
    return res.status(200).send(pkpassBuffer);
  } catch (error) {
    if (Array.isArray(error?.missing) && error.missing.length) {
      return res.status(500).json({
        ok: false,
        error: "Missing required environment variables",
        missing: error.missing,
      });
    }
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
