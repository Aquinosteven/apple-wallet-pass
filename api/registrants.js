import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { readJsonBodyStrict } from "../lib/requestValidation.js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
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

function getBearerToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || typeof authHeader !== "string") {
    return null;
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token.trim();
}

async function getAuthenticatedUser(req) {
  const token = getBearerToken(req);
  if (!token) {
    return { user: null, error: "Missing Authorization bearer token", status: 401 };
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return { user: null, error: "Invalid or expired auth token", status: 401 };
    }

    return { user: data.user, error: null, status: 200 };
  } catch {
    return { user: null, error: "Invalid or expired auth token", status: 401 };
  }
}

function normalizeOptionalField(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function createClaimToken() {
  return crypto.randomBytes(32).toString("hex");
}

async function createPassWithUniqueToken(supabase, eventId, registrantId) {
  const maxAttempts = 3;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const claimToken = createClaimToken();
    const { data, error } = await supabase
      .from("passes")
      .insert({
        event_id: eventId,
        registrant_id: registrantId,
        claim_token: claimToken,
      })
      .select("id,claim_token")
      .single();

    if (!error) {
      return { pass: data, error: null };
    }

    // Retry token generation on unique-constraint collisions.
    if (error.code === "23505" && String(error.message || "").includes("claim_token")) {
      continue;
    }

    return { pass: null, error };
  }

  return { pass: null, error: { message: "Unable to generate a unique claim token" } };
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const authResult = await getAuthenticatedUser(req);
    if (!authResult.user) {
      return res.status(authResult.status).json({ ok: false, error: authResult.error });
    }

    const parsedBody = await readJsonBodyStrict(req);
    if (!parsedBody.ok) {
      return res.status(parsedBody.status).json({ ok: false, error: parsedBody.error });
    }
    const body = parsedBody.body;
    if (!body || typeof body !== "object") {
      return res.status(400).json({ ok: false, error: "Invalid JSON body" });
    }

    const eventId = typeof body.eventId === "string" ? body.eventId.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone = normalizeOptionalField(body.phone);
    const source = normalizeOptionalField(body.source);

    if (!eventId) {
      return res.status(400).json({ ok: false, error: "eventId is required" });
    }
    if (!name) {
      return res.status(400).json({ ok: false, error: "name is required" });
    }
    if (!email) {
      return res.status(400).json({ ok: false, error: "email is required" });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ ok: false, error: "email must be valid" });
    }

    const supabase = getSupabaseAdmin();

    const { data: eventRow, error: eventError } = await supabase
      .from("events")
      .select("id")
      .eq("id", eventId)
      .eq("user_id", authResult.user.id)
      .maybeSingle();

    if (eventError) {
      return res.status(500).json({ ok: false, error: eventError.message });
    }

    if (!eventRow) {
      return res.status(404).json({ ok: false, error: "Event not found" });
    }

    const { data: registrant, error: registrantError } = await supabase
      .from("registrants")
      .insert({
        event_id: eventId,
        name,
        email,
        phone,
        source,
      })
      .select("id,event_id,name,email,phone,source,created_at")
      .single();

    if (registrantError) {
      return res.status(500).json({ ok: false, error: registrantError.message });
    }

    const { pass, error: passError } = await createPassWithUniqueToken(supabase, eventId, registrant.id);

    if (passError) {
      await supabase.from("registrants").delete().eq("id", registrant.id);
      return res.status(500).json({ ok: false, error: passError.message });
    }

    return res.status(201).json({
      ok: true,
      registrant,
      pass,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
