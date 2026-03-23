#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { getEnv, loadLocalEnvFiles } from "./env-loader.js";

const requiredObjects = [
  "accounts",
  "issuance_requests",
  "embed_sessions",
  "wallet_update_jobs",
  "pass_writeback_state",
  "audit_logs",
  "support_roles",
  "support_tickets",
  "audit_log",
];

function requiredEnv(name) {
  const value =
    name === "SUPABASE_URL"
      ? getEnv("SUPABASE_URL", ["VITE_SUPABASE_URL"])
      : getEnv(name);
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

async function main() {
  loadLocalEnvFiles();
  const supabaseUrl = requiredEnv("SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseHost = new URL(supabaseUrl).host;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const results = [];
  let failures = 0;
  for (const objectName of requiredObjects) {
    const { error } = await supabase.from(objectName).select("*").limit(1);
    const ok = !error;
    if (!ok) failures += 1;
    results.push({
      object: objectName,
      ok,
      error: error ? String(error.message || error).slice(0, 180) : null,
    });
  }

  for (const row of results) {
    const marker = row.ok ? "PASS" : "FAIL";
    console.log(`[${marker}] ${row.object}${row.error ? ` - ${row.error}` : ""}`);
  }

  if (failures > 0) {
    const unreachable = results.every(
      (row) => row.error && String(row.error).includes("fetch failed")
    );
    if (unreachable) {
      throw new Error(
        `Unable to reach Supabase project host ${supabaseHost}. Check SUPABASE_URL/VITE_SUPABASE_URL and confirm the project still exists.`
      );
    }
    console.error(`schema check failed: ${failures} required object(s) missing or inaccessible`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`schema check crashed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
