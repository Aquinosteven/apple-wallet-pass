import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { buildGhlOauthAuthorizeUrl, getMissingOauthConfigKeys, saveOauthState } from "../../../lib/ghlOAuth.js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
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

function getQueryValue(req, key) {
  const queryValue = req?.query?.[key];
  if (typeof queryValue === "string") return queryValue.trim();
  if (Array.isArray(queryValue) && typeof queryValue[0] === "string") {
    return queryValue[0].trim();
  }
  try {
    const parsed = new URL(req.url || "", "http://localhost");
    return String(parsed.searchParams.get(key) || "").trim();
  } catch {
    return "";
  }
}

function sanitizeReturnTo(returnTo) {
  const trimmed = String(returnTo || "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/")) return trimmed;
  return "";
}

export function createGhlOauthStartHandler(deps = {}) {
  const getSupabase = deps.getSupabaseAdmin || getSupabaseAdmin;
  return async function ghlOauthStartHandler(req, res) {
    setCors(res);
    if (req.method === "OPTIONS") return res.status(204).end();
    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method Not Allowed" });
    }

    const missingConfig = getMissingOauthConfigKeys();
    if (missingConfig.length > 0) {
      return res.status(500).json({ ok: false, error: "Missing OAuth configuration", missing: missingConfig });
    }

    try {
      const state = crypto.randomBytes(32).toString("hex");
      const returnTo = sanitizeReturnTo(getQueryValue(req, "return_to"));
      const supabase = getSupabase();
      await saveOauthState(supabase, state, returnTo);

      const authorizeUrl = buildGhlOauthAuthorizeUrl(state);
      res.setHeader("Location", authorizeUrl);
      return res.status(302).end();
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };
}

export default createGhlOauthStartHandler();
