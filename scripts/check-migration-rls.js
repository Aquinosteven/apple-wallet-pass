#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const scanRoots = [
  path.join(process.cwd(), "supabase", "migrations"),
  path.join(process.cwd(), "supabase", "legacy-migrations"),
];

const requiredRlsTables = [
  "admin_jobs",
  "admin_note_tags",
  "admin_notes",
  "admin_tags",
  "app_config",
  "app_error_log",
  "audit_logs",
  "claim_events",
  "data_exports",
  "impersonation_sessions",
  "integrations_ghl",
  "organization_members",
  "organizations",
  "reminder_sends",
  "support_roles",
  "support_tickets",
  "ticket_designs",
  "waitlist_signups",
  "workspace_integrations_ghl",
];

function listSqlFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .map((name) => path.join(dir, name));
}

const files = scanRoots.flatMap(listSqlFiles).sort();
if (files.length === 0) {
  console.error("no migration files found");
  process.exit(1);
}

const enabledRlsTables = new Set();
const policyTables = new Set();

for (const file of files) {
  const sql = fs.readFileSync(file, "utf8");

  for (const match of sql.matchAll(/alter\s+table\s+public\.([a-z0-9_]+)\s+enable\s+row\s+level\s+security\b/gi)) {
    enabledRlsTables.add(match[1].toLowerCase());
  }

  for (const match of sql.matchAll(/create\s+policy\s+[a-z0-9_"]+\s+on\s+public\.([a-z0-9_]+)/gi)) {
    policyTables.add(match[1].toLowerCase());
  }
}

const missingRequired = requiredRlsTables.filter((table) => !enabledRlsTables.has(table));
const policyWithoutRls = [...policyTables].filter((table) => !enabledRlsTables.has(table)).sort();

if (missingRequired.length > 0 || policyWithoutRls.length > 0) {
  for (const table of missingRequired) {
    console.error(`missing RLS enable statement for required table: public.${table}`);
  }
  for (const table of policyWithoutRls) {
    console.error(`policy exists but RLS enable statement was not found: public.${table}`);
  }
  process.exit(1);
}

console.log(
  `PASS: ${enabledRlsTables.size} table(s) enable RLS and ${policyTables.size} table(s) define policies across ${files.length} migration file(s)`
);
