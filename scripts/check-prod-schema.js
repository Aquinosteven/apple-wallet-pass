#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

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
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

async function main() {
  const supabaseUrl = requiredEnv("SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
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
    console.error(`schema check failed: ${failures} required object(s) missing or inaccessible`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`schema check crashed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});

