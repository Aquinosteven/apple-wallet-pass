#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { getEnv, loadLocalEnvFiles } from "./env-loader.js";

function asRequiredEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function asOptionalEnv(name) {
  const fallbackNames = name === "SUPABASE_URL" ? ["VITE_SUPABASE_URL"] : [];
  const value = getEnv(name, fallbackNames);
  return value || "";
}

function normalizeBaseUrl(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) throw new Error("BASE_URL is required");
  const parsed = new URL(trimmed);
  return parsed.toString().replace(/\/$/, "");
}

async function readJsonSafely(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function createClaimTokenViaRegistrants(baseUrl, authToken, eventId) {
  const timestamp = Date.now();
  const body = {
    eventId,
    name: `Smoke Test ${timestamp}`,
    email: `smoke+${timestamp}@example.com`,
    source: "release-smoke",
  };

  const response = await fetch(`${baseUrl}/api/registrants`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await readJsonSafely(response);

  if (!response.ok || !json?.pass?.claim_token) {
    throw new Error(`Failed to create claim token via /api/registrants (${response.status}): ${JSON.stringify(json)}`);
  }

  return {
    claimToken: String(json.pass.claim_token),
    passId: json.pass?.id ? String(json.pass.id) : "",
  };
}

async function fetchClaimPreview(baseUrl, claimToken) {
  const response = await fetch(`${baseUrl}/api/claim?token=${encodeURIComponent(claimToken)}`, {
    method: "GET",
  });

  const json = await readJsonSafely(response);

  if (!response.ok || !json?.ok || !json?.claim?.passId) {
    throw new Error(`Claim preview failed (${response.status}): ${JSON.stringify(json)}`);
  }

  return {
    passId: String(json.claim.passId),
    eventId: String(json.claim.eventId || ""),
  };
}

async function redeemClaim(baseUrl, claimToken) {
  const response = await fetch(`${baseUrl}/api/claim`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token: claimToken }),
  });

  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  const bytes = Buffer.from(await response.arrayBuffer());

  if (!response.ok) {
    const bodyText = bytes.toString("utf8").slice(0, 500);
    throw new Error(`Claim redeem failed (${response.status}): ${bodyText}`);
  }

  if (!contentType.includes("application/vnd.apple.pkpass")) {
    throw new Error(`Unexpected redeem content-type: ${contentType || "(empty)"}`);
  }

  if (bytes.length < 500) {
    throw new Error(`Redeem response too small for a pkpass (${bytes.length} bytes)`);
  }

  return { size: bytes.length, contentType };
}

async function generateGoogleSaveUrl(baseUrl, claimToken, passId, eventId) {
  const body = {
    claimId: claimToken,
    passId,
    eventId,
    joinUrl: `${baseUrl}/claim/${encodeURIComponent(claimToken)}`,
    cardTitle: "Smoke Wallet Pass",
    header: "Smoke Test",
    subheader: "Release Validation",
    details: "Release smoke test for Google Wallet link generation",
  };

  const response = await fetch(`${baseUrl}/api/google-save`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await readJsonSafely(response);

  if (!response.ok || !json?.ok || typeof json?.saveUrl !== "string") {
    throw new Error(`Google save failed (${response.status}): ${JSON.stringify(json)}`);
  }

  const saveUrl = String(json.saveUrl);
  if (!saveUrl.startsWith("https://pay.google.com/gp/v/save/")) {
    throw new Error(`Google save URL has unexpected format: ${saveUrl}`);
  }

  return saveUrl;
}

async function verifyClaimEvents(claimToken) {
  const supabaseUrl = asOptionalEnv("SUPABASE_URL") || asOptionalEnv("VITE_SUPABASE_URL");
  const serviceRoleKey = asOptionalEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY are required to verify claim_events");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("claim_events")
    .select("event_type,created_at")
    .eq("claim_id", claimToken)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(`claim_events query failed: ${error.message || String(error)}`);
  }

  const rows = Array.isArray(data) ? data : [];
  if (!rows.length) {
    throw new Error("No claim_events rows found for claim token");
  }

  const types = new Set(rows.map((row) => String(row.event_type || "")));
  const required = ["claim_started", "pkpass_downloaded", "google_wallet_link_created"];
  const missing = required.filter((eventType) => !types.has(eventType));

  if (missing.length) {
    throw new Error(`claim_events missing expected event_type values: ${missing.join(", ")}`);
  }

  return { rowCount: rows.length, eventTypes: [...types].sort() };
}

async function main() {
  loadLocalEnvFiles();

  const results = [];
  const pushResult = (name, ok, detail) => {
    results.push({ name, ok, detail });
    const marker = ok ? "PASS" : "FAIL";
    console.log(`[${marker}] ${name}${detail ? ` - ${detail}` : ""}`);
  };

  let baseUrl;
  let claimToken = asOptionalEnv("CLAIM_TOKEN");
  let passId = "";
  let eventId = asOptionalEnv("EVENT_ID");

  try {
    baseUrl = normalizeBaseUrl(
      getEnv("BASE_URL", ["NEXT_PUBLIC_API_BASE_URL", "VITE_APP_URL"])
    );
    pushResult("Base URL parsed", true, baseUrl);
  } catch (error) {
    pushResult("Base URL parsed", false, error instanceof Error ? error.message : String(error));
    summarizeAndExit(results);
    return;
  }

  if (!claimToken) {
    const authToken = asOptionalEnv("AUTH_TOKEN");
    if (!authToken || !eventId) {
      pushResult(
        "Create claim token",
        false,
        "Set CLAIM_TOKEN, or provide AUTH_TOKEN + EVENT_ID to auto-create via /api/registrants"
      );
      summarizeAndExit(results);
      return;
    }

    try {
      const created = await createClaimTokenViaRegistrants(baseUrl, authToken, eventId);
      claimToken = created.claimToken;
      passId = created.passId;
      pushResult("Create claim token", true, `token=${claimToken.slice(0, 10)}...`);
    } catch (error) {
      pushResult("Create claim token", false, error instanceof Error ? error.message : String(error));
      summarizeAndExit(results);
      return;
    }
  } else {
    pushResult("Create claim token", true, "Using provided CLAIM_TOKEN");
  }

  try {
    const response = await fetch(`${baseUrl}/claim/${encodeURIComponent(claimToken)}`, { method: "GET" });
    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    if (!response.ok) {
      throw new Error(`Status ${response.status}`);
    }
    if (!contentType.includes("text/html")) {
      throw new Error(`Unexpected content-type: ${contentType || "(empty)"}`);
    }
    pushResult("Open claim page", true, `status=${response.status}`);
  } catch (error) {
    pushResult("Open claim page", false, error instanceof Error ? error.message : String(error));
    summarizeAndExit(results);
    return;
  }

  try {
    const preview = await fetchClaimPreview(baseUrl, claimToken);
    passId = passId || preview.passId;
    eventId = eventId || preview.eventId;
    pushResult("Claim preview", true, `passId=${passId}`);
  } catch (error) {
    pushResult("Claim preview", false, error instanceof Error ? error.message : String(error));
    summarizeAndExit(results);
    return;
  }

  try {
    const redeemed = await redeemClaim(baseUrl, claimToken);
    pushResult("Redeem", true, `pkpass bytes=${redeemed.size}`);
    pushResult("Apple pass generation success", true, redeemed.contentType);
  } catch (error) {
    pushResult("Redeem", false, error instanceof Error ? error.message : String(error));
    pushResult("Apple pass generation success", false, "Redeem failed");
    summarizeAndExit(results);
    return;
  }

  try {
    const saveUrl = await generateGoogleSaveUrl(baseUrl, claimToken, passId, eventId);
    pushResult("Google Wallet save URL valid", true, saveUrl.slice(0, 80));
  } catch (error) {
    pushResult("Google Wallet save URL valid", false, error instanceof Error ? error.message : String(error));
    summarizeAndExit(results);
    return;
  }

  try {
    const verify = await verifyClaimEvents(claimToken);
    pushResult("claim_events row created", true, `${verify.rowCount} rows, types=${verify.eventTypes.join(",")}`);
  } catch (error) {
    pushResult("claim_events row created", false, error instanceof Error ? error.message : String(error));
    summarizeAndExit(results);
    return;
  }

  summarizeAndExit(results);
}

function summarizeAndExit(results) {
  console.log("\nSummary");
  for (const item of results) {
    console.log(`- ${item.ok ? "PASS" : "FAIL"}: ${item.name}`);
  }

  const failed = results.filter((item) => !item.ok).length;
  console.log(`\nResult: ${failed === 0 ? "PASS" : "FAIL"} (${results.length - failed}/${results.length} checks passed)`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("[FAIL] Smoke flow crashed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
