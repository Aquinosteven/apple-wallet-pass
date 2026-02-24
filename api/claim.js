import { createClient } from "@supabase/supabase-js";

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
      "id,claimed_at,event:events!passes_event_id_fkey(name,starts_at),registrant:registrants!passes_registrant_id_fkey(name,email)"
    )
    .eq("claim_token", token)
    .limit(1)
    .maybeSingle();

  if (error) {
    return { row: null, error: error.message };
  }

  return { row: data, error: null };
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

    const nowIso = new Date().toISOString();
    const { data: claimedPass, error: claimError } = await supabase
      .from("passes")
      .update({
        claimed_at: nowIso,
        last_updated_at: nowIso,
      })
      .eq("claim_token", token)
      .is("claimed_at", null)
      .select("id,claimed_at")
      .limit(1)
      .maybeSingle();

    if (claimError) {
      return res.status(500).json({ ok: false, error: claimError.message });
    }

    if (!claimedPass) {
      const { row, error } = await fetchClaimRowByToken(supabase, token);
      if (error) {
        return res.status(500).json({ ok: false, error });
      }
      if (!row) {
        return res.status(404).json({ ok: false, error: "Claim token not found" });
      }
      return res.status(409).json({ ok: false, error: "Claim token has already been used" });
    }

    return res.status(200).json({
      ok: true,
      claimedAt: claimedPass.claimed_at,
      next: {
        appleWallet: null,
        googleWallet: null,
      },
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
