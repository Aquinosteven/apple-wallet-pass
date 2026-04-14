import { rejectDisallowedOrigin, setJsonCors } from "../lib/apiAuth.js";
import { getAccessContext, resolveOwnerScope } from "../lib/threadCAccess.js";
import { captureMonitoringError } from "../lib/monitoring.js";

const WALLET_ADD_EVENT_TYPES = ["apple_wallet_added", "google_wallet_saved"];
const CLAIM_THROUGHPUT_EVENT_TYPES = ["claim_started", "pkpass_downloaded", "apple_wallet_added", "google_wallet_saved"];

function isMissingRelationError(error) {
  const message = String(error?.message || "").toLowerCase();
  const details = String(error?.details || "").toLowerCase();
  return message.includes("does not exist")
    || message.includes("could not find the table")
    || details.includes("does not exist");
}

function startOfDayIso(value) {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString();
}

function endOfDayIso(value) {
  const date = new Date(value);
  date.setUTCHours(23, 59, 59, 999);
  return date.toISOString();
}

function parseDateRange(query = {}) {
  const now = new Date();
  const defaultStart = new Date(now.getTime() - (6 * 24 * 60 * 60 * 1000));
  const start = query.start ? new Date(String(query.start)) : defaultStart;
  const end = query.end ? new Date(String(query.end)) : now;

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return null;
  }

  return {
    startIso: startOfDayIso(start),
    endIso: endOfDayIso(end),
  };
}

async function loadEventIds(supabase, ownerUserId) {
  if (!ownerUserId) return null;
  const { data, error } = await supabase.from("events").select("id").eq("user_id", ownerUserId);
  if (error) throw new Error(error.message || "Failed to load events");
  return (data || []).map((row) => row.id);
}

function buildByDayMap(startIso, endIso) {
  const out = {};
  const cursor = new Date(startIso);
  const end = new Date(endIso);
  while (cursor <= end) {
    out[cursor.toISOString().slice(0, 10)] = {
      date: cursor.toISOString().slice(0, 10),
      passesIssued: 0,
      walletAdds: 0,
      reminderSends: 0,
    };
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

function keyForCreatedAt(value) {
  return new Date(value).toISOString().slice(0, 10);
}

async function safeSelectRows(queryPromise, fallbackLabel, warnings) {
  const { data, error } = await queryPromise;
  if (!error) return data || [];
  if (isMissingRelationError(error)) {
    warnings.push(`missing_relation:${fallbackLabel}`);
    return [];
  }
  throw new Error(error.message || `Failed to load ${fallbackLabel}`);
}

async function safeSelectCount(queryPromise, fallbackLabel, warnings) {
  const { count, error } = await queryPromise;
  if (!error) {
    const numeric = Number(count);
    return Number.isFinite(numeric) ? numeric : 0;
  }
  if (isMissingRelationError(error)) {
    warnings.push(`missing_relation:${fallbackLabel}`);
    return 0;
  }
  throw new Error(error.message || `Failed to load ${fallbackLabel}`);
}

async function collectMetrics({ supabase, ownerUserId, startIso, endIso }) {
  const eventIds = await loadEventIds(supabase, ownerUserId);
  const byDay = buildByDayMap(startIso, endIso);
  const warnings = [];

  let passQuery = supabase
    .from("passes")
    .select("id,event_id,created_at")
    .gte("created_at", startIso)
    .lte("created_at", endIso);
  if (Array.isArray(eventIds)) {
    if (!eventIds.length) {
      passQuery = null;
    } else {
      passQuery = passQuery.in("event_id", eventIds);
    }
  }
  const passResult = passQuery ? await passQuery : { data: [], error: null };
  const passRows = passResult.data || [];
  const passError = passResult.error;
  if (passError) throw new Error(passError.message || "Failed to load pass metrics");

  let walletQuery = supabase
    .from("claim_events")
    .select("id,event_type,created_at,user_id")
    .in("event_type", WALLET_ADD_EVENT_TYPES)
    .gte("created_at", startIso)
    .lte("created_at", endIso);
  if (ownerUserId) {
    walletQuery = walletQuery.eq("user_id", ownerUserId);
  }
  const walletRows = await safeSelectRows(walletQuery, "wallet metrics", warnings);

  let reminderQuery = supabase
    .from("reminder_sends")
    .select("id,created_at,user_id")
    .gte("created_at", startIso)
    .lte("created_at", endIso);
  if (ownerUserId) {
    reminderQuery = reminderQuery.eq("user_id", ownerUserId);
  }
  const reminderRows = await safeSelectRows(reminderQuery, "reminder metrics", warnings);

  let claimThroughputQuery = supabase
    .from("claim_events")
    .select("id,event_type,user_id")
    .in("event_type", CLAIM_THROUGHPUT_EVENT_TYPES)
    .gte("created_at", startIso)
    .lte("created_at", endIso);
  if (ownerUserId) {
    claimThroughputQuery = claimThroughputQuery.eq("user_id", ownerUserId);
  }
  const claimThroughputRows = await safeSelectRows(claimThroughputQuery, "claim throughput", warnings);

  let claimErrorQuery = supabase
    .from("claim_events")
    .select("id", { count: "exact", head: true })
    .eq("event_type", "claim_error")
    .gte("created_at", startIso)
    .lte("created_at", endIso);
  if (ownerUserId) {
    claimErrorQuery = claimErrorQuery.eq("user_id", ownerUserId);
  }
  const claimErrors = await safeSelectCount(claimErrorQuery, "claim errors", warnings);

  let ghlWebhookQuery = supabase
    .from("ghl_webhook_logs")
    .select("id,processing_status,user_id,ghl_writeback_ok")
    .gte("created_at", startIso)
    .lte("created_at", endIso);
  if (ownerUserId) {
    ghlWebhookQuery = ghlWebhookQuery.eq("user_id", ownerUserId);
  }
  const ghlWebhookRows = await safeSelectRows(ghlWebhookQuery, "ghl webhook logs", warnings);

  let supportTicketsQuery = supabase
    .from("support_tickets")
    .select("id,status,owner_user_id,created_at")
    .gte("created_at", startIso)
    .lte("created_at", endIso);
  if (ownerUserId) {
    supportTicketsQuery = supportTicketsQuery.eq("owner_user_id", ownerUserId);
  }
  const supportTicketRows = await safeSelectRows(supportTicketsQuery, "support tickets", warnings);

  for (const row of passRows) {
    const key = keyForCreatedAt(row.created_at);
    if (byDay[key]) byDay[key].passesIssued += 1;
  }
  for (const row of walletRows) {
    const key = keyForCreatedAt(row.created_at);
    if (byDay[key]) byDay[key].walletAdds += 1;
  }
  for (const row of reminderRows) {
    const key = keyForCreatedAt(row.created_at);
    if (byDay[key]) byDay[key].reminderSends += 1;
  }

  const issuanceFailures = ghlWebhookRows.filter((row) => row.processing_status === "failed").length;
  const writebackAttempts = ghlWebhookRows.filter((row) => row.ghl_writeback_ok !== null).length;
  const writebackSuccesses = ghlWebhookRows.filter((row) => row.ghl_writeback_ok === true).length;
  const openSupportTickets = supportTicketRows.filter((row) => String(row.status || "").toLowerCase() !== "closed").length;
  const series = Object.values(byDay);
  return {
    range: { start: startIso, end: endIso, defaultWindow: "last_7_days" },
    totals: {
      passesIssued: series.reduce((sum, item) => sum + item.passesIssued, 0),
      walletAdds: series.reduce((sum, item) => sum + item.walletAdds, 0),
      reminderSends: series.reduce((sum, item) => sum + item.reminderSends, 0),
      claimThroughput: claimThroughputRows.length,
      claimErrors,
      issuanceFailures,
      ghlWritebackAttempts: writebackAttempts,
      ghlWritebackSuccesses: writebackSuccesses,
      supportTicketsCreated: supportTicketRows.length,
      supportTicketsOpen: openSupportTickets,
    },
    series,
    ops: {
      writebackSuccessRate: writebackAttempts > 0 ? Number((writebackSuccesses / writebackAttempts).toFixed(4)) : null,
      warnings,
    },
  };
}

export function createDashboardMetricsHandler(deps = {}) {
  const getAccessContextImpl = deps.getAccessContext || getAccessContext;
  const resolveOwnerScopeImpl = deps.resolveOwnerScope || resolveOwnerScope;
  const collectMetricsImpl = deps.collectMetrics || collectMetrics;

  return async function handler(req, res) {
    const cors = setJsonCors(req, res, ["GET", "OPTIONS"]);
    if (req.method === "OPTIONS") return cors.originAllowed
      ? res.status(204).end()
      : res.status(403).json({ ok: false, error: "Origin not allowed" });
    if (rejectDisallowedOrigin(res, cors)) return;
    if (req.method !== "GET") return res.status(405).json({ ok: false, error: "Method Not Allowed" });

    try {
      const access = await getAccessContextImpl(req);
      if (!access.ok) return res.status(access.status).json({ ok: false, error: access.error });
      const dateRange = parseDateRange(req.query);
      if (!dateRange) return res.status(400).json({ ok: false, error: "Invalid date range" });

      const ownerUserId = resolveOwnerScopeImpl(access.context, req.query?.ownerUserId);
      const metrics = await collectMetricsImpl({
        supabase: access.context.supabase,
        ownerUserId,
        startIso: dateRange.startIso,
        endIso: dateRange.endIso,
      });

      return res.status(200).json({ ok: true, ...metrics });
    } catch (error) {
      captureMonitoringError(error, { endpoint: "/api/dashboard-metrics" });
      return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" });
    }
  };
}

export default createDashboardMetricsHandler();
