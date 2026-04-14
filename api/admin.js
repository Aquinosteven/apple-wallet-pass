import crypto from "node:crypto";
import { rejectDisallowedOrigin, setJsonCors } from "../lib/apiAuth.js";
import { readJsonBodyStrict } from "../lib/requestValidation.js";
import {
  assertAdminAccess,
  assertInternalSupport,
  getAccessContext,
  getLegacyRoleLabel,
  hasAdminAccess,
  hasAdminSuperAccess,
  resolveOwnerScope,
} from "../lib/threadCAccess.js";
import { writeAuditLog } from "../lib/auditLog.js";
import { captureMonitoringError } from "../lib/monitoring.js";

const PROMO_CAP = 100;
const PROMO_BASELINE_CLAIMED = 17;
const HEALTH_ACTIVITY_WINDOW_DAYS = 30;
const HEALTH_SIGNIN_STALE_DAYS = 7;
const INTERNAL_OWNER_EMAILS = new Set([
  "access@badmarketing.com",
]);
const INTERNAL_OWNER_DOMAINS = new Set([
  "showfi.io",
]);
const INTERNAL_PLAN_CODES = new Set([
  "admin_internal",
  "free_access_v1",
  "internal_agency_free_v1",
]);
const INTERNAL_ACCESS_TYPES = new Set([
  "internal_admin",
  "free",
]);
const APP_CONFIG_KEYS = {
  promoCounter: "promo.counter",
  planLimits: "plan.limits",
};
const ACCOUNT_BILLING_STATES = new Set(["trial", "active", "past_due", "canceled"]);
const SUPPORT_TICKET_STATUSES = new Set(["open", "triaged", "waiting", "resolved"]);
const ADMIN_NOTE_SCOPES = new Set(["account", "user", "ticket"]);
const IMPERSONATION_WINDOW_MINUTES = 30;

function isMissingRelationError(error) {
  const message = String(error?.message || "").toLowerCase();
  const details = String(error?.details || "").toLowerCase();
  return message.includes("does not exist")
    || message.includes("could not find the table")
    || details.includes("does not exist");
}

function safeJsonObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
}

function parseBooleanFlag(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function trimString(value) {
  return String(value || "").trim();
}

function normalizeQueryValue(value) {
  return String(value || "").trim().toLowerCase();
}

function daysAgoIso(days) {
  return new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString();
}

function dateToEpoch(value) {
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function countRecentRows(rows, field, sinceIso) {
  const since = dateToEpoch(sinceIso);
  return rows.filter((row) => dateToEpoch(row?.[field]) >= since).length;
}

function latestDateFromRows(rows, field) {
  const latest = rows
    .map((row) => row?.[field])
    .filter(Boolean)
    .sort((a, b) => dateToEpoch(b) - dateToEpoch(a))[0];
  return latest || null;
}

function emailDomain(value) {
  const normalized = normalizeQueryValue(value);
  const atIndex = normalized.lastIndexOf("@");
  if (atIndex < 0) return "";
  return normalized.slice(atIndex + 1);
}

function isInternalAccountRecord(row) {
  const ownerEmail = normalizeQueryValue(row?.owner_email);
  const ownerDomain = emailDomain(ownerEmail);
  const planCode = normalizeQueryValue(row?.subscription?.plan_code);
  const accessType = normalizeQueryValue(row?.subscription?.metadata?.access_type);
  return INTERNAL_OWNER_EMAILS.has(ownerEmail)
    || INTERNAL_OWNER_DOMAINS.has(ownerDomain)
    || INTERNAL_PLAN_CODES.has(planCode)
    || INTERNAL_ACCESS_TYPES.has(accessType);
}

function isCustomerTouchNote(note) {
  return normalizeQueryValue(note?.metadata?.kind) === "customer_touch" || note?.metadata?.customer_touch === true;
}

function summarizeCustomerTouch(note) {
  if (!note) {
    return {
      last_touched_at: null,
      last_touch_summary: null,
      touch_count: 0,
    };
  }
  return {
    last_touched_at: note.created_at || null,
    last_touch_summary: trimString(note.body) || null,
    touch_count: 1,
  };
}

function buildHealthSummary(row) {
  const reasons = [];
  const onboardingBlockers = [];
  const paidAt = row.subscription.current_period_start || row.created_at || null;
  const paidAtEpoch = dateToEpoch(paidAt);
  const accountAgeDays = paidAtEpoch ? Math.max((Date.now() - paidAtEpoch) / (24 * 60 * 60 * 1000), 0) : 0;
  const hasActivity = row.usage.passes_total > 0 || row.usage.issuance_requests_total > 0;
  const hasActivation = row.usage.passes_total > 0 || row.usage.issuance_requests_completed > 0;
  const hasRecentActivity = row.usage.passes_last_30_days > 0 || row.usage.issuance_requests_last_30_days > 0;
  const lastSignInEpoch = dateToEpoch(row.onboarding.last_sign_in_at);

  if (row.support.open_tickets > 0) {
    reasons.push(`${row.support.open_tickets} open support ticket${row.support.open_tickets === 1 ? "" : "s"}`);
    onboardingBlockers.push("Support request needs follow-up");
  }
  if (!row.onboarding.integration_connected) {
    onboardingBlockers.push("No integration connected");
    if (accountAgeDays >= 1) reasons.push("No integration connected after signup");
  }
  if (row.onboarding.event_count === 0) {
    onboardingBlockers.push("No event created");
    if (accountAgeDays >= 1) reasons.push("No event created yet");
  }
  if (!hasActivation && accountAgeDays >= 2) {
    reasons.push("No passes or successful issuances yet");
  }
  if (!row.onboarding.last_sign_in_at) {
    reasons.push("No sign-in recorded after signup");
  } else if (lastSignInEpoch && lastSignInEpoch < dateToEpoch(daysAgoIso(HEALTH_SIGNIN_STALE_DAYS))) {
    reasons.push("No recent sign-in in the last 7 days");
  }
  if (row.onboarding.last_error) {
    reasons.push("Integration has a recent error");
    onboardingBlockers.push("Recent integration error");
  }

  let status = "healthy";
  if (reasons.length >= 2 || row.support.open_tickets > 0 || (!hasActivity && accountAgeDays >= 2)) {
    status = "at_risk";
  } else if (!hasRecentActivity || !hasActivation || !row.onboarding.integration_connected) {
    status = "watch";
  }

  let summary = "Customer is active with recent usage.";
  if (status === "at_risk") {
    summary = "Customer is paid but stalled before activation.";
  } else if (status === "watch") {
    summary = "Customer is still onboarding and needs a check-in.";
  }

  let nextAction = "Keep monitoring recent usage.";
  if (row.support.open_tickets > 0) {
    nextAction = "Reply to the open support ticket and offer a hands-on onboarding assist.";
  } else if (!row.onboarding.integration_connected) {
    nextAction = "Prompt them to connect their first integration and build the first live workflow.";
  } else if (row.onboarding.event_count === 0) {
    nextAction = "Help them create the first event and test the first issuance.";
  } else if (!hasActivation) {
    nextAction = "Push for the first successful issuance so they reach activation.";
  }

  return {
    status,
    summary,
    reasons,
    onboarding_blockers: [...new Set(onboardingBlockers)],
    next_action: nextAction,
    account_age_days: Math.floor(accountAgeDays),
    activated: hasActivation,
  };
}

function parseAdminRoute(req) {
  const parsed = new URL(req.url || "/api/admin", "http://localhost");
  const adminPathFromRewrite = trimString(parsed.searchParams.get("adminPath"));
  const rawPath = adminPathFromRewrite
    ? `/${adminPathFromRewrite.replace(/^\/+/, "")}`
    : parsed.pathname.replace(/^\/api\/admin/, "") || "/";
  const normalizedPath = rawPath === "/" ? "/" : rawPath.replace(/\/+$/, "");
  const segments = normalizedPath.split("/").filter(Boolean);
  return {
    path: normalizedPath,
    segments,
    searchParams: parsed.searchParams,
  };
}

function requireReason(body) {
  const reason = trimString(body?.reason);
  if (!reason) return { ok: false, status: 400, error: "reason is required" };
  return { ok: true, reason };
}

async function fetchAppConfig(supabase, key) {
  const { data, error } = await supabase
    .from("app_config")
    .select("key,value,updated_at")
    .eq("key", key)
    .maybeSingle();
  if (error) {
    if (isMissingRelationError(error)) return null;
    throw new Error(error.message || `Failed to load config: ${key}`);
  }
  return data || null;
}

async function upsertAppConfig(supabase, key, value) {
  const payload = { key, value };
  const { data, error } = await supabase
    .from("app_config")
    .upsert(payload, { onConflict: "key" })
    .select("key,value,updated_at")
    .single();
  if (error) throw new Error(error.message || `Failed to save config: ${key}`);
  return data;
}

async function lookupEventIdsForOwner(supabase, ownerUserId) {
  if (!ownerUserId) return null;
  const { data, error } = await supabase.from("events").select("id").eq("user_id", ownerUserId);
  if (error) throw new Error(error.message || "Failed to load owner events");
  return (data || []).map((row) => row.id);
}

async function countClaimedPasses(supabase, ownerUserId) {
  const eventIds = await lookupEventIdsForOwner(supabase, ownerUserId);
  let query = supabase.from("passes").select("id", { count: "exact", head: true }).not("claimed_at", "is", null);
  if (Array.isArray(eventIds)) {
    if (!eventIds.length) return 0;
    query = query.in("event_id", eventIds);
  }
  const { count, error } = await query;
  if (error) throw new Error(error.message || "Failed to count claimed passes");
  return count || 0;
}

async function getPromoCounter(supabase, ownerUserId) {
  const [configRow, claimedFromData] = await Promise.all([
    fetchAppConfig(supabase, APP_CONFIG_KEYS.promoCounter),
    countClaimedPasses(supabase, ownerUserId),
  ]);

  const configuredClaimed = Number(configRow?.value?.claimed);
  const cap = Number(configRow?.value?.cap) > 0 ? Number(configRow.value.cap) : PROMO_CAP;
  const baselineClaimed = Number.isFinite(configuredClaimed) ? configuredClaimed : PROMO_BASELINE_CLAIMED;
  const claimed = Math.max(claimedFromData, baselineClaimed);

  return {
    claimed,
    cap,
    remaining: Math.max(cap - claimed, 0),
    source: { baselineClaimed, claimedFromData },
  };
}

async function listPlanHooks(supabase) {
  const configRow = await fetchAppConfig(supabase, APP_CONFIG_KEYS.planLimits);
  return configRow?.value || {
    plan: "v1",
    limits: {
      monthly_passes: 10000,
      support_seats: 2,
    },
  };
}

async function listFailedJobs(supabase, ownerUserId) {
  let query = supabase
    .from("admin_jobs")
    .select("id,owner_user_id,job_type,status,error_message,attempt_count,created_at,updated_at,replayed_from_id")
    .eq("status", "failed")
    .order("created_at", { ascending: false })
    .limit(100);
  if (ownerUserId) query = query.eq("owner_user_id", ownerUserId);
  const { data, error } = await query;
  if (error) {
    if (isMissingRelationError(error)) return [];
    throw new Error(error.message || "Failed to load jobs");
  }
  return data || [];
}

async function listAuditLogs(supabase, ownerUserId, options = {}) {
  const oneYearAgo = new Date(Date.now() - (365 * 24 * 60 * 60 * 1000)).toISOString();
  let query = supabase
    .from("audit_logs")
    .select("id,actor_user_id,owner_user_id,action,target_type,target_id,metadata,created_at")
    .gte("created_at", options.since || oneYearAgo)
    .order("created_at", { ascending: false })
    .limit(Number(options.limit || 200));
  if (ownerUserId) query = query.eq("owner_user_id", ownerUserId);
  if (options.actorUserId) query = query.eq("actor_user_id", options.actorUserId);
  if (options.action) query = query.ilike("action", `%${options.action}%`);
  if (options.targetType) query = query.eq("target_type", options.targetType);
  const { data, error } = await query;
  if (error) throw new Error(error.message || "Failed to load audit logs");
  return data || [];
}

function currentUsageMonth() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

async function listAuthUsers(supabase, { search = "" } = {}) {
  try {
    const { data, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (error) throw error;
    const term = normalizeQueryValue(search);
    return (data?.users || []).filter((user) => {
      if (!term) return true;
      const haystack = [
        user.id,
        user.email,
        ...(Array.isArray(user.identities) ? user.identities.map((identity) => identity?.provider) : []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to load auth users");
  }
}

async function listCustomerAccounts(supabase, ownerUserId, options = {}) {
  let accountsQuery = supabase
    .from("accounts")
    .select("id,owner_user_id,slug,name,billing_state,enforcement_enabled,hard_block_issuance,monthly_included_issuances,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(Number(options.limit || 200));

  if (ownerUserId) accountsQuery = accountsQuery.eq("owner_user_id", ownerUserId);
  const statusFilter = normalizeQueryValue(options.billingState);
  if (ACCOUNT_BILLING_STATES.has(statusFilter)) {
    accountsQuery = accountsQuery.eq("billing_state", statusFilter);
  }

  const { data: accounts, error: accountsError } = await accountsQuery;
  if (accountsError) {
    if (isMissingRelationError(accountsError)) return [];
    throw new Error(accountsError.message || "Failed to load customer accounts");
  }

  const accountIds = (accounts || []).map((row) => row.id).filter(Boolean);
  if (!accountIds.length) return [];

  const ownerUserIds = [...new Set((accounts || []).map((row) => row.owner_user_id).filter(Boolean))];

  const [subscriptionsResult, usageResult, authUsers, eventsResult, integrationsResult, supportTicketsResult, issuanceRequestsResult, adminNotesResult] = await Promise.all([
    supabase
      .from("account_subscriptions")
      .select("account_id,provider,provider_customer_id,plan_code,status,current_period_start,current_period_end,metadata")
      .in("account_id", accountIds),
    supabase
      .from("account_usage_monthly")
      .select("account_id,usage_month,issuances_count,overage_count,blocked_count,last_issued_at")
      .eq("usage_month", currentUsageMonth())
      .in("account_id", accountIds),
    listAuthUsers(supabase, {}),
    supabase
      .from("events")
      .select("id,account_id,status,created_at,updated_at")
      .in("account_id", accountIds),
    supabase
      .from("integrations_ghl")
      .select("user_id,location_id,verified_at,last_webhook_at,last_error,updated_at")
      .in("user_id", ownerUserIds),
    supabase
      .from("support_tickets")
      .select("id,owner_user_id,status,subject,created_at,updated_at")
      .in("owner_user_id", ownerUserIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("issuance_requests")
      .select("id,account_id,status,created_at,updated_at,failure_reason,pass_id")
      .in("account_id", accountIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("admin_notes")
      .select("id,scope,target_id,body,author_user_id,metadata,created_at,updated_at")
      .eq("scope", "account")
      .in("target_id", accountIds)
      .order("created_at", { ascending: false }),
  ]);

  if (subscriptionsResult.error && !isMissingRelationError(subscriptionsResult.error)) {
    throw new Error(subscriptionsResult.error.message || "Failed to load account subscriptions");
  }

  if (usageResult.error && !isMissingRelationError(usageResult.error)) {
    throw new Error(usageResult.error.message || "Failed to load account usage");
  }
  if (eventsResult.error && !isMissingRelationError(eventsResult.error)) {
    throw new Error(eventsResult.error.message || "Failed to load account events");
  }
  if (integrationsResult.error && !isMissingRelationError(integrationsResult.error)) {
    throw new Error(integrationsResult.error.message || "Failed to load integration status");
  }
  if (supportTicketsResult.error && !isMissingRelationError(supportTicketsResult.error)) {
    throw new Error(supportTicketsResult.error.message || "Failed to load support tickets");
  }
  if (issuanceRequestsResult.error && !isMissingRelationError(issuanceRequestsResult.error)) {
    throw new Error(issuanceRequestsResult.error.message || "Failed to load issuance requests");
  }
  if (adminNotesResult.error && !isMissingRelationError(adminNotesResult.error)) {
    throw new Error(adminNotesResult.error.message || "Failed to load admin notes");
  }

  const eventIds = (eventsResult.data || []).map((row) => row.id).filter(Boolean);
  const passesResult = eventIds.length
    ? await supabase
      .from("passes")
      .select("id,event_id,claimed_at,created_at,last_updated_at")
      .in("event_id", eventIds)
      .order("created_at", { ascending: false })
    : { data: [], error: null };
  if (passesResult.error && !isMissingRelationError(passesResult.error)) {
    throw new Error(passesResult.error.message || "Failed to load passes");
  }

  const usersById = new Map(
    authUsers
      .filter((user) => ownerUserIds.includes(user.id))
      .map((user) => [user.id, user])
  );
  const subscriptionsByAccountId = new Map(
    (subscriptionsResult.data || []).map((row) => [row.account_id, row])
  );
  const usageByAccountId = new Map(
    (usageResult.data || []).map((row) => [row.account_id, row])
  );
  const eventsByAccountId = new Map();
  for (const row of (eventsResult.data || [])) {
    if (!eventsByAccountId.has(row.account_id)) eventsByAccountId.set(row.account_id, []);
    eventsByAccountId.get(row.account_id).push(row);
  }
  const eventToAccountId = new Map(
    (eventsResult.data || []).map((row) => [row.id, row.account_id])
  );
  const integrationsByUserId = new Map(
    (integrationsResult.data || []).map((row) => [row.user_id, row])
  );
  const supportTicketsByUserId = new Map();
  for (const row of (supportTicketsResult.data || [])) {
    if (!supportTicketsByUserId.has(row.owner_user_id)) supportTicketsByUserId.set(row.owner_user_id, []);
    supportTicketsByUserId.get(row.owner_user_id).push(row);
  }
  const issuanceRequestsByAccountId = new Map();
  for (const row of (issuanceRequestsResult.data || [])) {
    if (!issuanceRequestsByAccountId.has(row.account_id)) issuanceRequestsByAccountId.set(row.account_id, []);
    issuanceRequestsByAccountId.get(row.account_id).push(row);
  }
  const passesByAccountId = new Map();
  for (const row of (passesResult.data || [])) {
    const accountId = eventToAccountId.get(row.event_id);
    if (!accountId) continue;
    if (!passesByAccountId.has(accountId)) passesByAccountId.set(accountId, []);
    passesByAccountId.get(accountId).push(row);
  }
  const customerTouchByAccountId = new Map();
  const customerTouchCountsByAccountId = new Map();
  for (const row of (adminNotesResult.data || [])) {
    if (!isCustomerTouchNote(row)) continue;
    customerTouchCountsByAccountId.set(row.target_id, Number(customerTouchCountsByAccountId.get(row.target_id) || 0) + 1);
    if (!customerTouchByAccountId.has(row.target_id)) {
      customerTouchByAccountId.set(row.target_id, row);
    }
  }

  const recentActivitySince = daysAgoIso(HEALTH_ACTIVITY_WINDOW_DAYS);

  const rows = (accounts || []).map((account) => {
    const subscription = subscriptionsByAccountId.get(account.id) || null;
    const usage = usageByAccountId.get(account.id) || null;
    const ownerUser = usersById.get(account.owner_user_id) || null;
    const events = eventsByAccountId.get(account.id) || [];
    const publishedEvents = events.filter((row) => row.status === "published");
    const integration = integrationsByUserId.get(account.owner_user_id) || null;
    const supportTickets = supportTicketsByUserId.get(account.owner_user_id) || [];
    const issuanceRequests = issuanceRequestsByAccountId.get(account.id) || [];
    const passes = passesByAccountId.get(account.id) || [];
    const billingState = String(account.billing_state || "").toLowerCase();
    const subscriptionStatus = String(subscription?.status || "inactive").toLowerCase();
    const isPaid = billingState === "active" || subscriptionStatus === "active";
    const row = {
      id: account.id,
      owner_user_id: account.owner_user_id,
      owner_email: ownerUser?.email || null,
      slug: account.slug,
      name: account.name,
      billing_state: account.billing_state,
      enforcement_enabled: account.enforcement_enabled !== false,
      hard_block_issuance: account.hard_block_issuance === true,
      monthly_included_issuances: Number(account.monthly_included_issuances || 0),
      created_at: account.created_at,
      updated_at: account.updated_at,
      is_paid: isPaid,
      subscription: {
        provider: subscription?.provider || null,
        provider_customer_id: subscription?.provider_customer_id || null,
        plan_code: subscription?.plan_code || null,
        status: subscription?.status || "inactive",
        current_period_start: subscription?.current_period_start || null,
        current_period_end: subscription?.current_period_end || null,
      },
      usage: {
        usage_month: usage?.usage_month || currentUsageMonth(),
        issuances_count: Number(usage?.issuances_count || 0),
        overage_count: Number(usage?.overage_count || 0),
        blocked_count: Number(usage?.blocked_count || 0),
        last_issued_at: usage?.last_issued_at || null,
      },
      onboarding: {
        email_confirmed_at: ownerUser?.email_confirmed_at || null,
        last_sign_in_at: ownerUser?.last_sign_in_at || null,
        integration_connected: Boolean(integration?.location_id),
        integration_verified_at: integration?.verified_at || null,
        last_webhook_at: integration?.last_webhook_at || null,
        last_error: integration?.last_error || null,
        event_count: events.length,
        published_event_count: publishedEvents.length,
        latest_event_updated_at: latestDateFromRows(events, "updated_at"),
      },
      support: {
        open_tickets: supportTickets.filter((ticket) => !["resolved", "closed"].includes(String(ticket.status || "").toLowerCase())).length,
        last_ticket_at: supportTickets[0]?.created_at || null,
        last_ticket_subject: supportTickets[0]?.subject || null,
      },
    };
    row.usage.passes_total = passes.length;
    row.usage.passes_claimed_total = passes.filter((pass) => pass.claimed_at).length;
    row.usage.passes_last_30_days = countRecentRows(passes, "created_at", recentActivitySince);
    row.usage.issuance_requests_total = issuanceRequests.length;
    row.usage.issuance_requests_completed = issuanceRequests.filter((request) => request.status === "completed").length;
    row.usage.issuance_requests_failed = issuanceRequests.filter((request) => request.status === "failed").length;
    row.usage.issuance_requests_last_30_days = countRecentRows(issuanceRequests, "created_at", recentActivitySince);
    row.usage.last_pass_created_at = passes[0]?.created_at || null;
    row.usage.last_claimed_at = latestDateFromRows(passes.filter((pass) => pass.claimed_at), "claimed_at");
    row.internal = isInternalAccountRecord(row);
    row.customer_touch = {
      ...summarizeCustomerTouch(customerTouchByAccountId.get(account.id) || null),
      touch_count: Number(customerTouchCountsByAccountId.get(account.id) || 0),
    };
    row.health = buildHealthSummary(row);
    return row;
  });

  const realOnly = parseBooleanFlag(options.realOnly, false);
  const paidOnly = parseBooleanFlag(options.paidOnly, false);
  const searchTerm = normalizeQueryValue(options.search);
  const filteredRows = rows.filter((row) => {
    if (paidOnly && (!row.is_paid || row.internal)) return false;
    if (!realOnly) return true;
    const normalizedEmail = normalizeQueryValue(row.owner_email);
    const normalizedName = normalizeQueryValue(row.name);
    const normalizedSlug = normalizeQueryValue(row.slug);
    const normalizedPlan = normalizeQueryValue(row.subscription.plan_code);
    const isTrial = normalizeQueryValue(row.billing_state) === "trial";
    const isExampleDomain = normalizedEmail.endsWith("@example.com");
    const looksSynthetic = [
      normalizedEmail,
      normalizedName,
      normalizedSlug,
      normalizedPlan,
    ].some((value) => /(^|[\W_])(qa|test|demo|codex|stub|sandbox)([\W_]|$)/.test(value));
    return !row.internal && !isTrial && !isExampleDomain && !looksSynthetic;
  });

  if (!searchTerm) return filteredRows;

  return filteredRows.filter((row) => {
    const haystack = [
      row.id,
      row.owner_user_id,
      row.owner_email,
      row.slug,
      row.name,
      row.subscription.provider_customer_id,
      row.subscription.plan_code,
      row.subscription.provider,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(searchTerm);
  });
}

async function getAccountById(supabase, accountId) {
  const rows = await listCustomerAccounts(supabase, null, { limit: 500 });
  return rows.find((row) => row.id === accountId) || null;
}

async function listSupportTickets(supabase, ownerUserId, options = {}) {
  let query = supabase
    .from("support_tickets")
    .select("id,owner_user_id,requester_name,requester_email,subject,message,status,metadata,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(Number(options.limit || 200));
  if (ownerUserId) query = query.eq("owner_user_id", ownerUserId);
  if (options.status && SUPPORT_TICKET_STATUSES.has(options.status)) {
    query = query.eq("status", options.status);
  }
  const { data, error } = await query;
  if (error) {
    if (isMissingRelationError(error)) return [];
    throw new Error(error.message || "Failed to load support tickets");
  }
  const searchTerm = normalizeQueryValue(options.search);
  const rows = data || [];
  if (!searchTerm) return rows;
  return rows.filter((row) => {
    const haystack = [
      row.owner_user_id,
      row.requester_name,
      row.requester_email,
      row.subject,
      row.message,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(searchTerm);
  });
}

async function listAdminNotes(supabase, filters = {}) {
  let query = supabase
    .from("admin_notes")
    .select("id,scope,target_id,body,author_user_id,metadata,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(Number(filters.limit || 100));
  if (filters.scope) query = query.eq("scope", filters.scope);
  if (filters.targetId) query = query.eq("target_id", filters.targetId);
  const { data, error } = await query;
  if (error) {
    if (isMissingRelationError(error)) return [];
    throw new Error(error.message || "Failed to load admin notes");
  }
  return data || [];
}

async function insertAdminNote(supabase, actorUserId, input) {
  const scope = trimString(input?.scope);
  const targetId = trimString(input?.targetId);
  const body = trimString(input?.body);
  if (!ADMIN_NOTE_SCOPES.has(scope)) return { ok: false, status: 400, error: "scope is invalid" };
  if (!targetId) return { ok: false, status: 400, error: "targetId is required" };
  if (!body) return { ok: false, status: 400, error: "body is required" };

  const { data, error } = await supabase
    .from("admin_notes")
    .insert({
      scope,
      target_id: targetId,
      body,
      author_user_id: actorUserId,
      metadata: safeJsonObject(input?.metadata),
    })
    .select("id,scope,target_id,body,author_user_id,metadata,created_at,updated_at")
    .single();
  if (error) {
    if (isMissingRelationError(error)) {
      return { ok: false, status: 503, error: "Admin notes unavailable until the latest schema patch is applied" };
    }
    throw new Error(error.message || "Failed to create admin note");
  }
  return { ok: true, status: 200, note: data };
}

async function updateCustomerAccountService(supabase, actorUserId, actorRole, input) {
  const accountId = trimString(input?.accountId || input?.id);
  if (!accountId) return { ok: false, status: 400, error: "accountId is required" };

  const reasonResult = requireReason(input);
  if (!reasonResult.ok) return reasonResult;

  const current = await getAccountById(supabase, accountId);
  if (!current) return { ok: false, status: 404, error: "Account not found" };

  const billingState = normalizeQueryValue(input?.billingState || current.billing_state);
  if (!ACCOUNT_BILLING_STATES.has(billingState)) {
    return { ok: false, status: 400, error: "billingState must be one of trial, active, past_due, canceled" };
  }

  const monthlyIncludedIssuances = Number(input?.monthlyIncludedIssuances ?? current.monthly_included_issuances);
  if (!Number.isFinite(monthlyIncludedIssuances) || monthlyIncludedIssuances < 0) {
    return { ok: false, status: 400, error: "monthlyIncludedIssuances must be a non-negative number" };
  }

  const updates = {
    billing_state: billingState,
    monthly_included_issuances: Math.floor(monthlyIncludedIssuances),
    enforcement_enabled: input?.enforcementEnabled !== undefined ? input.enforcementEnabled !== false : current.enforcement_enabled,
    hard_block_issuance: input?.hardBlockIssuance !== undefined ? input.hardBlockIssuance === true : current.hard_block_issuance,
  };

  const { data: updated, error } = await supabase
    .from("accounts")
    .update(updates)
    .eq("id", accountId)
    .select("id,owner_user_id,billing_state,monthly_included_issuances,enforcement_enabled,hard_block_issuance")
    .maybeSingle();

  if (error) throw new Error(error.message || "Failed to update customer account");
  if (!updated) return { ok: false, status: 404, error: "Account not found" };

  const nextPlanCode = trimString(input?.planCode);
  if (nextPlanCode) {
    const { error: subscriptionError } = await supabase
      .from("account_subscriptions")
      .update({
        plan_code: nextPlanCode,
        status: billingState === "active" ? "active" : billingState,
      })
      .eq("account_id", updated.id);
    if (subscriptionError && !isMissingRelationError(subscriptionError)) {
      throw new Error(subscriptionError.message || "Failed to update subscription plan");
    }
  }

  await writeAuditLog(supabase, {
    actorUserId,
    ownerUserId: updated.owner_user_id,
    action: "admin.account.service.update",
    targetType: "account",
    targetId: updated.id,
    metadata: {
      origin: "admin_center",
      actor_role: actorRole,
      reason: reasonResult.reason,
      before: {
        billing_state: current.billing_state,
        monthly_included_issuances: current.monthly_included_issuances,
        enforcement_enabled: current.enforcement_enabled,
        hard_block_issuance: current.hard_block_issuance,
        plan_code: current.subscription.plan_code,
      },
      after: {
        ...updates,
        plan_code: nextPlanCode || current.subscription.plan_code,
      },
    },
  });

  return {
    ok: true,
    status: 200,
    account: {
      id: updated.id,
      owner_user_id: updated.owner_user_id,
      billing_state: updated.billing_state,
      monthly_included_issuances: updated.monthly_included_issuances,
      enforcement_enabled: updated.enforcement_enabled !== false,
      hard_block_issuance: updated.hard_block_issuance === true,
    },
  };
}

async function retryFailedJob(supabase, actorUserId, actorRole, jobId, reason) {
  const { data: job, error: loadError } = await supabase
    .from("admin_jobs")
    .select("id,owner_user_id,job_type,payload,status,error_message,attempt_count")
    .eq("id", jobId)
    .maybeSingle();
  if (loadError) {
    if (isMissingRelationError(loadError)) {
      return { ok: false, status: 503, error: "Admin jobs unavailable until the latest schema patch is applied" };
    }
    throw new Error(loadError.message || "Failed to load job");
  }
  if (!job) return { ok: false, status: 404, error: "Job not found" };
  if (job.status !== "failed") return { ok: false, status: 400, error: "Only failed jobs can be retried" };

  const nextPayload = {
    owner_user_id: job.owner_user_id,
    job_type: job.job_type,
    payload: job.payload || {},
    status: "queued",
    replayed_from_id: job.id,
    attempt_count: 0,
  };
  const { data: queuedJob, error: queueError } = await supabase
    .from("admin_jobs")
    .insert(nextPayload)
    .select("id,owner_user_id,job_type,status,created_at,replayed_from_id")
    .single();
  if (queueError) throw new Error(queueError.message || "Failed to queue retry");

  await writeAuditLog(supabase, {
    actorUserId,
    ownerUserId: job.owner_user_id,
    action: "admin.job.retry",
    targetType: "admin_job",
    targetId: job.id,
    metadata: {
      origin: "admin_center",
      actor_role: actorRole,
      reason,
      queuedJobId: queuedJob.id,
    },
  });

  return { ok: true, status: 200, queuedJob };
}

async function buildOverviewPayload(supabase) {
  const [accounts, failedJobs, supportTickets, auditLogs] = await Promise.all([
    listCustomerAccounts(supabase, null, { limit: 300 }),
    listFailedJobs(supabase, null),
    listSupportTickets(supabase, null, { limit: 100 }),
    listAuditLogs(supabase, null, { limit: 50 }),
  ]);

  const activeAccounts = accounts.filter((row) => row.billing_state === "active").length;
  const trialAccounts = accounts.filter((row) => row.billing_state === "trial").length;
  const pastDueAccounts = accounts.filter((row) => row.billing_state === "past_due").length;
  const canceledAccounts = accounts.filter((row) => row.billing_state === "canceled").length;
  const recentSignups = accounts.filter((row) => {
    const createdAt = Date.parse(row.created_at || "");
    return Number.isFinite(createdAt) && createdAt >= Date.now() - (7 * 24 * 60 * 60 * 1000);
  }).length;
  const openSupportTickets = supportTickets.filter((ticket) => !["resolved", "closed"].includes(String(ticket.status || "").toLowerCase())).length;
  const paidAccounts = accounts.filter((row) => row.is_paid && !row.internal);
  const healthyPaidAccounts = paidAccounts.filter((row) => row.health.status === "healthy").length;
  const watchPaidAccounts = paidAccounts.filter((row) => row.health.status === "watch").length;
  const atRiskPaidAccounts = paidAccounts.filter((row) => row.health.status === "at_risk");

  return {
    kpis: {
      activeAccounts,
      trialAccounts,
      pastDueAccounts,
      canceledAccounts,
      failedJobs: failedJobs.length,
      openSupportTickets,
      recentSignups,
      paidAccounts: paidAccounts.length,
      healthyPaidAccounts,
      watchPaidAccounts,
      atRiskPaidAccounts: atRiskPaidAccounts.length,
    },
    needsAttention: {
      pastDueAccounts: accounts.filter((row) => row.billing_state === "past_due").slice(0, 10),
      atRiskPaidAccounts: atRiskPaidAccounts.slice(0, 10),
      failedJobs: failedJobs.slice(0, 10),
      recentErrors: auditLogs
        .filter((entry) => String(entry.action || "").toLowerCase().includes("fail") || String(entry.action || "").toLowerCase().includes("error"))
        .slice(0, 10),
    },
  };
}

async function buildAccountDetailPayload(supabase, accountId) {
  const account = await getAccountById(supabase, accountId);
  if (!account) return null;

  const [notes, tickets, auditLogs] = await Promise.all([
    listAdminNotes(supabase, { scope: "account", targetId: accountId, limit: 50 }),
    listSupportTickets(supabase, account.owner_user_id, { limit: 50 }),
    listAuditLogs(supabase, account.owner_user_id, { limit: 100 }),
  ]);

  return {
    account,
    notes,
    tickets,
    auditLogs,
    timeline: [...notes, ...auditLogs, ...tickets]
      .map((item) => ({
        id: item.id,
        type: item.action ? "audit" : item.subject ? "support" : "note",
        created_at: item.created_at,
        summary: item.action || item.subject || item.body || "Activity",
        metadata: item.metadata || {},
      }))
      .sort((a, b) => Date.parse(b.created_at || "") - Date.parse(a.created_at || "")),
  };
}

async function buildUsersPayload(supabase, search) {
  const [users, accounts] = await Promise.all([
    listAuthUsers(supabase, { search }),
    listCustomerAccounts(supabase, null, { limit: 500 }),
  ]);

  const accountsByOwnerId = new Map(accounts.map((account) => [account.owner_user_id, account]));
  return users.map((user) => {
    const account = accountsByOwnerId.get(user.id) || null;
    return {
      id: user.id,
      email: user.email || null,
      created_at: user.created_at || null,
      last_sign_in_at: user.last_sign_in_at || null,
      email_confirmed_at: user.email_confirmed_at || null,
      providers: Array.isArray(user.identities) ? user.identities.map((identity) => identity?.provider).filter(Boolean) : [],
      account: account ? {
        id: account.id,
        name: account.name,
        slug: account.slug,
        billing_state: account.billing_state,
      } : null,
    };
  });
}

async function resetUserPassword(supabase, actorUserId, actorRole, userId, body) {
  const reasonResult = requireReason(body);
  if (!reasonResult.ok) return reasonResult;

  const temporaryPassword = trimString(body?.temporaryPassword)
    || `ShowFi-${crypto.randomBytes(5).toString("base64url")}`;

  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    password: temporaryPassword,
    email_confirm: true,
  });
  if (error) throw new Error(error.message || "Failed to reset user password");

  await writeAuditLog(supabase, {
    actorUserId,
    ownerUserId: userId,
    action: "admin.user.password_reset",
    targetType: "user",
    targetId: userId,
    metadata: {
      origin: "admin_center",
      actor_role: actorRole,
      reason: reasonResult.reason,
      mode: "temporary_password",
      email: data.user?.email || null,
    },
  });

  return {
    ok: true,
    status: 200,
    temporaryPassword,
    user: {
      id: data.user?.id || userId,
      email: data.user?.email || null,
    },
  };
}

async function startImpersonationSession(supabase, actorUserId, actorRole, body) {
  const reasonResult = requireReason(body);
  if (!reasonResult.ok) return reasonResult;
  const targetUserId = trimString(body?.targetUserId);
  const targetAccountId = trimString(body?.targetAccountId);
  if (!targetUserId && !targetAccountId) {
    return { ok: false, status: 400, error: "targetUserId or targetAccountId is required" };
  }

  const expiresAt = new Date(Date.now() + (IMPERSONATION_WINDOW_MINUTES * 60 * 1000)).toISOString();
  const payload = {
    actor_user_id: actorUserId,
    target_user_id: targetUserId || null,
    target_account_id: targetAccountId || null,
    reason: reasonResult.reason,
    mode: "full_access",
    issued_at: new Date().toISOString(),
    expires_at: expiresAt,
  };
  const { data, error } = await supabase
    .from("impersonation_sessions")
    .insert(payload)
    .select("id,actor_user_id,target_user_id,target_account_id,reason,mode,issued_at,expires_at,ended_at")
    .single();
  if (error) {
    if (isMissingRelationError(error)) {
      return { ok: false, status: 503, error: "Impersonation sessions unavailable until the latest schema patch is applied" };
    }
    throw new Error(error.message || "Failed to start impersonation session");
  }

  await writeAuditLog(supabase, {
    actorUserId,
    ownerUserId: targetUserId || null,
    action: "admin.impersonation.start",
    targetType: targetAccountId ? "account" : "user",
    targetId: targetAccountId || targetUserId,
    metadata: {
      origin: "admin_center",
      actor_role: actorRole,
      reason: reasonResult.reason,
      session_id: data.id,
      expires_at: expiresAt,
    },
  });

  return { ok: true, status: 200, session: data };
}

async function endImpersonationSession(supabase, actorUserId, actorRole, body) {
  const sessionId = trimString(body?.sessionId);
  if (!sessionId) return { ok: false, status: 400, error: "sessionId is required" };

  const reasonResult = requireReason(body);
  if (!reasonResult.ok) return reasonResult;

  const { data, error } = await supabase
    .from("impersonation_sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", sessionId)
    .is("ended_at", null)
    .select("id,target_user_id,target_account_id")
    .maybeSingle();
  if (error) throw new Error(error.message || "Failed to end impersonation session");
  if (!data) return { ok: false, status: 404, error: "Impersonation session not found" };

  await writeAuditLog(supabase, {
    actorUserId,
    ownerUserId: data.target_user_id || null,
    action: "admin.impersonation.end",
    targetType: data.target_account_id ? "account" : "user",
    targetId: data.target_account_id || data.target_user_id,
    metadata: {
      origin: "admin_center",
      actor_role: actorRole,
      reason: reasonResult.reason,
      session_id: sessionId,
    },
  });

  return { ok: true, status: 200 };
}

async function updateSupportTicket(supabase, actorUserId, actorRole, ticketId, body) {
  const reasonResult = requireReason(body);
  if (!reasonResult.ok) return reasonResult;
  const nextStatus = normalizeQueryValue(body?.status);
  if (nextStatus && !SUPPORT_TICKET_STATUSES.has(nextStatus)) {
    return { ok: false, status: 400, error: "status is invalid" };
  }

  const { data: current, error: currentError } = await supabase
    .from("support_tickets")
    .select("id,owner_user_id,status,metadata")
    .eq("id", ticketId)
    .maybeSingle();
  if (currentError) throw new Error(currentError.message || "Failed to load support ticket");
  if (!current) return { ok: false, status: 404, error: "Support ticket not found" };

  const metadata = {
    ...safeJsonObject(current.metadata),
    ...(trimString(body?.assigneeUserId) ? { assignee_user_id: trimString(body.assigneeUserId) } : {}),
    ...(Array.isArray(body?.labels) ? { labels: body.labels.filter(Boolean) } : {}),
  };

  const { data, error } = await supabase
    .from("support_tickets")
    .update({
      status: nextStatus || current.status,
      metadata,
    })
    .eq("id", ticketId)
    .select("id,owner_user_id,requester_name,requester_email,subject,message,status,metadata,created_at,updated_at")
    .maybeSingle();
  if (error) throw new Error(error.message || "Failed to update support ticket");
  if (!data) return { ok: false, status: 404, error: "Support ticket not found" };

  await writeAuditLog(supabase, {
    actorUserId,
    ownerUserId: current.owner_user_id,
    action: "admin.support.ticket.update",
    targetType: "support_ticket",
    targetId: ticketId,
    metadata: {
      origin: "admin_center",
      actor_role: actorRole,
      reason: reasonResult.reason,
      before: {
        status: current.status,
        metadata: current.metadata || {},
      },
      after: {
        status: data.status,
        metadata: data.metadata || {},
      },
    },
  });

  return { ok: true, status: 200, ticket: data };
}

async function buildOperationsPayload(supabase) {
  const [failedJobs, auditLogs, supportTickets] = await Promise.all([
    listFailedJobs(supabase, null),
    listAuditLogs(supabase, null, { limit: 100 }),
    listSupportTickets(supabase, null, { limit: 100 }),
  ]);

  return {
    failedJobs,
    recentAudit: auditLogs.slice(0, 40),
    recentFailures: auditLogs.filter((entry) => {
      const action = String(entry.action || "").toLowerCase();
      return action.includes("fail") || action.includes("error") || action.includes("retry");
    }).slice(0, 25),
    openSupportTickets: supportTickets.filter((ticket) => !["resolved", "closed"].includes(String(ticket.status || "").toLowerCase())).slice(0, 25),
  };
}

async function buildBillingPayload(supabase, options = {}) {
  const accounts = await listCustomerAccounts(supabase, null, {
    billingState: options.status,
    search: options.search,
    limit: 300,
  });
  return {
    subscriptions: accounts.map((account) => ({
      account_id: account.id,
      account_name: account.name,
      account_slug: account.slug,
      owner_user_id: account.owner_user_id,
      owner_email: account.owner_email,
      billing_state: account.billing_state,
      provider: account.subscription.provider,
      provider_customer_id: account.subscription.provider_customer_id,
      plan_code: account.subscription.plan_code,
      status: account.subscription.status,
      current_period_start: account.subscription.current_period_start,
      current_period_end: account.subscription.current_period_end,
      enforcement_enabled: account.enforcement_enabled,
      hard_block_issuance: account.hard_block_issuance,
      monthly_included_issuances: account.monthly_included_issuances,
    })),
  };
}

function buildLegacyPanelResponse(accessContext, ownerScope, overview, accounts, failedJobs, auditLogs, promoCounter, planHooks) {
  return {
    ok: true,
    role: getLegacyRoleLabel(accessContext.role),
    adminRole: accessContext.role,
    ownerScope: ownerScope || "all",
    promoCounter,
    planHooks,
    failedJobs,
    auditLogs,
    customerAccounts: accounts,
    overview,
  };
}

function defaultOverviewPayload() {
  return {
    kpis: {
      activeAccounts: 0,
      trialAccounts: 0,
      pastDueAccounts: 0,
      canceledAccounts: 0,
      failedJobs: 0,
      openSupportTickets: 0,
      recentSignups: 0,
      paidAccounts: 0,
      healthyPaidAccounts: 0,
      watchPaidAccounts: 0,
      atRiskPaidAccounts: 0,
    },
    needsAttention: {
      pastDueAccounts: [],
      atRiskPaidAccounts: [],
      failedJobs: [],
      recentErrors: [],
    },
  };
}

export function createAdminHandler(deps = {}) {
  const getAccessContextImpl = deps.getAccessContext || getAccessContext;
  const resolveOwnerScopeImpl = deps.resolveOwnerScope || resolveOwnerScope;
  const assertInternalSupportImpl = deps.assertInternalSupport || assertInternalSupport;
  const writeAuditLogImpl = deps.writeAuditLog || writeAuditLog;
  const getPromoCounterImpl = deps.getPromoCounter || getPromoCounter;
  const listPlanHooksImpl = deps.listPlanHooks || listPlanHooks;
  const listFailedJobsImpl = deps.listFailedJobs || listFailedJobs;
  const listAuditLogsImpl = deps.listAuditLogs || listAuditLogs;
  const listCustomerAccountsImpl = deps.listCustomerAccounts || listCustomerAccounts;
  const upsertAppConfigImpl = deps.upsertAppConfig || upsertAppConfig;
  const retryFailedJobImpl = deps.retryFailedJob || retryFailedJob;
  const updateCustomerAccountServiceImpl = deps.updateCustomerAccountService || updateCustomerAccountService;

  return async function handler(req, res) {
    const cors = setJsonCors(req, res, ["GET", "POST", "PATCH", "OPTIONS"]);
    if (req.method === "OPTIONS") return cors.originAllowed
      ? res.status(204).end()
      : res.status(403).json({ ok: false, error: "Origin not allowed" });
    if (rejectDisallowedOrigin(res, cors)) return;
    if (!["GET", "POST", "PATCH"].includes(req.method || "")) {
      return res.status(405).json({ ok: false, error: "Method Not Allowed" });
    }

    try {
      const access = await getAccessContextImpl(req);
      if (!access.ok) return res.status(access.status).json({ ok: false, error: access.error });
      if (!hasAdminAccess(access.context.role)) {
        return res.status(403).json({ ok: false, error: "Admin access denied" });
      }

      const route = parseAdminRoute(req);
      const supabase = access.context.supabase;
      const ownerUserId = resolveOwnerScopeImpl(access.context, req.query?.ownerUserId || route.searchParams.get("ownerUserId"));

      if (req.method === "GET" && (route.path === "/" || route.path === "")) {
        const [promoCounter, planHooks, failedJobs, auditLogs, customerAccounts, overview] = await Promise.all([
          getPromoCounterImpl(supabase, ownerUserId),
          listPlanHooksImpl(supabase),
          listFailedJobsImpl(supabase, ownerUserId),
          listAuditLogsImpl(supabase, ownerUserId),
          listCustomerAccountsImpl(supabase, ownerUserId),
          buildOverviewPayload(supabase).catch(() => defaultOverviewPayload()),
        ]);
        return res.status(200).json(
          buildLegacyPanelResponse(access.context, ownerUserId, overview, customerAccounts, failedJobs, auditLogs, promoCounter, planHooks)
        );
      }

      if (req.method === "GET" && route.path === "/session") {
        return res.status(200).json({
          ok: true,
          isAdmin: true,
          role: access.context.role,
          legacyRole: getLegacyRoleLabel(access.context.role),
          user: {
            id: access.context.user.id,
            email: access.context.user.email || null,
          },
        });
      }

      if (req.method === "GET" && route.path === "/overview") {
        return res.status(200).json({
          ok: true,
          role: access.context.role,
          ...(await buildOverviewPayload(supabase).catch(() => defaultOverviewPayload())),
        });
      }

      if (req.method === "GET" && route.path === "/accounts") {
        const accounts = await listCustomerAccountsImpl(supabase, ownerUserId, {
          search: route.searchParams.get("q") || "",
          billingState: route.searchParams.get("status") || "",
          realOnly: route.searchParams.get("realOnly") || "true",
          paidOnly: route.searchParams.get("paidOnly") || "",
          limit: route.searchParams.get("limit") || "200",
        });
        return res.status(200).json({ ok: true, role: access.context.role, accounts });
      }

      if (req.method === "GET" && route.segments[0] === "accounts" && route.segments[1]) {
        const payload = await buildAccountDetailPayload(supabase, route.segments[1]);
        if (!payload) return res.status(404).json({ ok: false, error: "Account not found" });
        return res.status(200).json({ ok: true, role: access.context.role, ...payload });
      }

      if (req.method === "PATCH" && route.segments[0] === "accounts" && route.segments[1]) {
        const supportGate = assertInternalSupportImpl(access.context);
        if (!supportGate.ok) return res.status(supportGate.status).json({ ok: false, error: supportGate.error });
        const parsedBody = await readJsonBodyStrict(req);
        if (!parsedBody.ok) return res.status(parsedBody.status).json({ ok: false, error: parsedBody.error });
        const result = await updateCustomerAccountServiceImpl(supabase, access.context.user.id, access.context.role, {
          ...parsedBody.body,
          accountId: route.segments[1],
        });
        if (!result.ok) return res.status(result.status).json({ ok: false, error: result.error });
        return res.status(200).json({ ok: true, account: result.account });
      }

      if (req.method === "GET" && route.path === "/users") {
        const users = await buildUsersPayload(supabase, route.searchParams.get("q") || "");
        return res.status(200).json({ ok: true, role: access.context.role, users });
      }

      if (req.method === "POST" && route.segments[0] === "users" && route.segments[2] === "reset-password") {
        const gate = assertAdminAccess(access.context, "admin_super");
        if (!gate.ok) return res.status(gate.status).json({ ok: false, error: gate.error });
        const parsedBody = await readJsonBodyStrict(req);
        if (!parsedBody.ok) return res.status(parsedBody.status).json({ ok: false, error: parsedBody.error });
        const result = await resetUserPassword(supabase, access.context.user.id, access.context.role, route.segments[1], parsedBody.body || {});
        if (!result.ok) return res.status(result.status).json({ ok: false, error: result.error });
        return res.status(200).json(result);
      }

      if (req.method === "GET" && route.path === "/billing") {
        const billing = await buildBillingPayload(supabase, {
          status: route.searchParams.get("status") || "",
          search: route.searchParams.get("q") || "",
        });
        return res.status(200).json({ ok: true, role: access.context.role, ...billing });
      }

      if (req.method === "GET" && route.path === "/support") {
        const tickets = await listSupportTickets(supabase, null, {
          status: route.searchParams.get("status") || "",
          search: route.searchParams.get("q") || "",
        });
        const accountIds = [...new Set(tickets.map((ticket) => ticket.owner_user_id).filter(Boolean))];
        const notes = await listAdminNotes(supabase, { scope: "account", limit: 200 });
        return res.status(200).json({
          ok: true,
          role: access.context.role,
          tickets,
          notes: notes.filter((note) => accountIds.includes(note.target_id)),
        });
      }

      if (req.method === "PATCH" && route.segments[0] === "support" && route.segments[1]) {
        const supportGate = assertInternalSupportImpl(access.context);
        if (!supportGate.ok) return res.status(supportGate.status).json({ ok: false, error: supportGate.error });
        const parsedBody = await readJsonBodyStrict(req);
        if (!parsedBody.ok) return res.status(parsedBody.status).json({ ok: false, error: parsedBody.error });
        const result = await updateSupportTicket(supabase, access.context.user.id, access.context.role, route.segments[1], parsedBody.body || {});
        if (!result.ok) return res.status(result.status).json({ ok: false, error: result.error });
        return res.status(200).json(result);
      }

      if (req.method === "GET" && route.path === "/operations") {
        return res.status(200).json({ ok: true, role: access.context.role, ...(await buildOperationsPayload(supabase)) });
      }

      if (req.method === "POST" && route.segments[0] === "jobs" && route.segments[2] === "retry") {
        const supportGate = assertInternalSupportImpl(access.context);
        if (!supportGate.ok) return res.status(supportGate.status).json({ ok: false, error: supportGate.error });
        const parsedBody = await readJsonBodyStrict(req);
        if (!parsedBody.ok) return res.status(parsedBody.status).json({ ok: false, error: parsedBody.error });
        const reasonResult = requireReason(parsedBody.body || {});
        if (!reasonResult.ok) return res.status(reasonResult.status).json({ ok: false, error: reasonResult.error });
        const result = await retryFailedJobImpl(supabase, access.context.user.id, access.context.role, route.segments[1], reasonResult.reason);
        if (!result.ok) return res.status(result.status).json({ ok: false, error: result.error });
        return res.status(200).json({ ok: true, queuedJob: result.queuedJob });
      }

      if (req.method === "GET" && route.path === "/audit") {
        const audit = await listAuditLogsImpl(supabase, null, {
          actorUserId: route.searchParams.get("actorUserId") || "",
          action: route.searchParams.get("action") || "",
          targetType: route.searchParams.get("targetType") || "",
          since: route.searchParams.get("since") || undefined,
          limit: route.searchParams.get("limit") || "200",
        });
        return res.status(200).json({ ok: true, role: access.context.role, auditLogs: audit });
      }

      if (req.method === "POST" && route.path === "/impersonation/start") {
        const gate = assertAdminAccess(access.context, "admin_super");
        if (!gate.ok) return res.status(gate.status).json({ ok: false, error: gate.error });
        const parsedBody = await readJsonBodyStrict(req);
        if (!parsedBody.ok) return res.status(parsedBody.status).json({ ok: false, error: parsedBody.error });
        const result = await startImpersonationSession(supabase, access.context.user.id, access.context.role, parsedBody.body || {});
        if (!result.ok) return res.status(result.status).json({ ok: false, error: result.error });
        return res.status(200).json(result);
      }

      if (req.method === "POST" && route.path === "/impersonation/end") {
        const gate = assertAdminAccess(access.context, "admin_super");
        if (!gate.ok) return res.status(gate.status).json({ ok: false, error: gate.error });
        const parsedBody = await readJsonBodyStrict(req);
        if (!parsedBody.ok) return res.status(parsedBody.status).json({ ok: false, error: parsedBody.error });
        const result = await endImpersonationSession(supabase, access.context.user.id, access.context.role, parsedBody.body || {});
        if (!result.ok) return res.status(result.status).json({ ok: false, error: result.error });
        return res.status(200).json(result);
      }

      if (req.method === "POST" && route.path === "/notes") {
        const supportGate = assertInternalSupportImpl(access.context);
        if (!supportGate.ok) return res.status(supportGate.status).json({ ok: false, error: supportGate.error });
        const parsedBody = await readJsonBodyStrict(req);
        if (!parsedBody.ok) return res.status(parsedBody.status).json({ ok: false, error: parsedBody.error });
        const reasonResult = requireReason(parsedBody.body || {});
        if (!reasonResult.ok) return res.status(reasonResult.status).json({ ok: false, error: reasonResult.error });
        const result = await insertAdminNote(supabase, access.context.user.id, parsedBody.body || {});
        if (!result.ok) return res.status(result.status).json({ ok: false, error: result.error });
        await writeAuditLogImpl(supabase, {
          actorUserId: access.context.user.id,
          ownerUserId: null,
          action: "admin.note.create",
          targetType: parsedBody.body?.scope || "note",
          targetId: parsedBody.body?.targetId || result.note?.id,
          metadata: {
            origin: "admin_center",
            actor_role: access.context.role,
            reason: reasonResult.reason,
            note_id: result.note?.id || null,
          },
        });
        return res.status(200).json(result);
      }

      if (req.method === "POST") {
        const parsedBody = await readJsonBodyStrict(req);
        if (!parsedBody.ok) return res.status(parsedBody.status).json({ ok: false, error: parsedBody.error });
        const action = trimString(parsedBody.body?.action);

        if (action === "promo.override") {
          const supportGate = assertInternalSupportImpl(access.context);
          if (!supportGate.ok) return res.status(supportGate.status).json({ ok: false, error: supportGate.error });
          const claimed = Number(parsedBody.body?.claimed);
          if (!Number.isFinite(claimed) || claimed < 0) {
            return res.status(400).json({ ok: false, error: "claimed must be a non-negative number" });
          }
          const cap = Number(parsedBody.body?.cap);
          const value = {
            claimed,
            cap: Number.isFinite(cap) && cap > 0 ? cap : PROMO_CAP,
          };

          await upsertAppConfigImpl(supabase, APP_CONFIG_KEYS.promoCounter, value);
          await writeAuditLogImpl(supabase, {
            actorUserId: access.context.user.id,
            ownerUserId: null,
            action: "admin.promo.override",
            targetType: "app_config",
            targetId: APP_CONFIG_KEYS.promoCounter,
            metadata: {
              ...value,
              origin: "admin_center",
              actor_role: access.context.role,
            },
          });
          return res.status(200).json({ ok: true, promoCounter: value });
        }

        if (action === "plan_limits.update") {
          const supportGate = assertInternalSupportImpl(access.context);
          if (!supportGate.ok) return res.status(supportGate.status).json({ ok: false, error: supportGate.error });
          const value = parsedBody.body?.value;
          if (!value || typeof value !== "object" || Array.isArray(value)) {
            return res.status(400).json({ ok: false, error: "value must be an object" });
          }
          const saved = await upsertAppConfigImpl(supabase, APP_CONFIG_KEYS.planLimits, value);
          await writeAuditLogImpl(supabase, {
            actorUserId: access.context.user.id,
            ownerUserId: null,
            action: "admin.plan_limits.update",
            targetType: "app_config",
            targetId: APP_CONFIG_KEYS.planLimits,
            metadata: {
              ...safeJsonObject(value),
              origin: "admin_center",
              actor_role: access.context.role,
            },
          });
          return res.status(200).json({ ok: true, planHooks: saved.value || {} });
        }

        if (action === "jobs.retry" || action === "jobs.replay") {
          const supportGate = assertInternalSupportImpl(access.context);
          if (!supportGate.ok) return res.status(supportGate.status).json({ ok: false, error: supportGate.error });
          const jobId = trimString(parsedBody.body?.jobId);
          if (!jobId) return res.status(400).json({ ok: false, error: "jobId is required" });
          const reasonResult = requireReason(parsedBody.body || {});
          if (!reasonResult.ok) return res.status(reasonResult.status).json({ ok: false, error: reasonResult.error });
          const result = await retryFailedJobImpl(supabase, access.context.user.id, access.context.role, jobId, reasonResult.reason);
          if (!result.ok) return res.status(result.status).json({ ok: false, error: result.error });
          return res.status(200).json({ ok: true, queuedJob: result.queuedJob });
        }

        if (action === "account.service.update") {
          const supportGate = assertInternalSupportImpl(access.context);
          if (!supportGate.ok) return res.status(supportGate.status).json({ ok: false, error: supportGate.error });
          const result = await updateCustomerAccountServiceImpl(supabase, access.context.user.id, access.context.role, parsedBody.body || {});
          if (!result.ok) return res.status(result.status).json({ ok: false, error: result.error });
          return res.status(200).json({ ok: true, account: result.account });
        }
      }

      return res.status(404).json({ ok: false, error: "Unsupported admin route" });
    } catch (error) {
      captureMonitoringError(error, { endpoint: "/api/admin" });
      return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" });
    }
  };
}

export default createAdminHandler();
