import { createClient } from "@supabase/supabase-js";

function boolFromEnv(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

let supabaseClient = null;
function getSupabase() {
  if (supabaseClient) return supabaseClient;
  const url = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) return null;
  supabaseClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-client-info": "apple-wallet-pass/monitoring" } },
  });
  return supabaseClient;
}

export function getMonitoringConfig() {
  return {
    errorLog: {
      enabled: Boolean(getSupabase()),
      sink: "supabase:app_error_log",
      environment: String(process.env.VERCEL_ENV || process.env.NODE_ENV || "development"),
    },
    uptime: {
      enabled: boolFromEnv(process.env.UPTIME_MONITOR_ENABLED),
      pingTokenConfigured: Boolean(String(process.env.UPTIME_MONITOR_PING_TOKEN || "").trim()),
      pingUrlConfigured: Boolean(String(process.env.UPTIME_MONITOR_PING_URL || "").trim()),
    },
    slack: {
      enabled: false,
      deferred: true,
    },
  };
}

export function captureMonitoringError(error, context = {}) {
  const client = getSupabase();
  if (!client) return;
  const isError = error instanceof Error;
  const row = {
    source: typeof context?.source === "string" ? context.source : null,
    message: isError ? error.message : String(error || "unknown_error"),
    error_name: isError ? error.name : null,
    stack: isError ? String(error.stack || "").slice(0, 8000) : null,
    context: context && typeof context === "object" ? context : null,
    environment: String(process.env.VERCEL_ENV || process.env.NODE_ENV || "development"),
    release: process.env.VERCEL_GIT_COMMIT_SHA || null,
  };
  client.from("app_error_log").insert(row).then(
    ({ error: insertError }) => {
      if (insertError) {
        console.error("[monitoring] insert_failed", insertError.message || insertError);
      }
    },
    (err) => {
      console.error("[monitoring] insert_threw", err?.message || err);
    }
  );
}
