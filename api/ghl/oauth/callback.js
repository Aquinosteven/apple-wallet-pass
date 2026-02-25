import { createClient } from "@supabase/supabase-js";
import {
  consumeOauthState,
  ensureShowfiContactCustomFields,
  exchangeOauthCodeForTokens,
  getMissingOauthConfigKeys,
  upsertGhlInstallation,
} from "../../../lib/ghlOAuth.js";

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

function safeReturnTo(returnTo) {
  const trimmed = String(returnTo || "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/")) return trimmed;
  return "";
}

function buildSuccessRedirectPath(returnTo, locationId) {
  const basePath = safeReturnTo(returnTo) || "/";
  const url = new URL(basePath, "http://localhost");
  url.searchParams.set("ghl_connected", "1");
  if (locationId) url.searchParams.set("ghl_location_id", locationId);
  return `${url.pathname}${url.search}`;
}

export function createGhlOauthCallbackHandler(deps = {}) {
  const getSupabase = deps.getSupabaseAdmin || getSupabaseAdmin;
  const fetchImpl = deps.fetchImpl || globalThis.fetch?.bind(globalThis);

  return async function ghlOauthCallbackHandler(req, res) {
    setCors(res);
    if (req.method === "OPTIONS") return res.status(204).end();
    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method Not Allowed" });
    }

    const missingConfig = getMissingOauthConfigKeys();
    if (missingConfig.length > 0) {
      return res.status(500).json({ ok: false, error: "Missing OAuth configuration", missing: missingConfig });
    }

    const code = getQueryValue(req, "code");
    const state = getQueryValue(req, "state");
    if (!code || !state) {
      return res.status(400).json({ ok: false, error: "Missing code or state" });
    }

    try {
      const supabase = getSupabase();
      const consumedState = await consumeOauthState(supabase, state);
      if (!consumedState) {
        return res.status(400).json({ ok: false, error: "Invalid or expired OAuth state" });
      }

      const tokenSet = await exchangeOauthCodeForTokens({ code, fetchImpl });
      await upsertGhlInstallation(supabase, tokenSet);

      let provisioned = false;
      let provisioningStatus = 200;
      try {
        const result = await ensureShowfiContactCustomFields({
          fetchImpl,
          accessToken: tokenSet.accessToken,
          locationId: tokenSet.locationId,
        });
        provisioned = Boolean(result?.ok);
      } catch (error) {
        provisioned = false;
        provisioningStatus = Number.isInteger(error?.status) ? error.status : 500;
      }

      const returnTo = safeReturnTo(consumedState.return_to);
      if (returnTo) {
        const redirectPath = buildSuccessRedirectPath(returnTo, tokenSet.locationId);
        res.setHeader("Location", redirectPath);
        return res.status(302).end();
      }

      return res.status(200).json({
        ok: true,
        locationId: tokenSet.locationId,
        provisionedCustomFields: provisioned,
        provisioningStatus,
      });
    } catch (error) {
      const status = Number.isInteger(error?.status) ? error.status : 500;
      return res.status(status).json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };
}

export default createGhlOauthCallbackHandler();
