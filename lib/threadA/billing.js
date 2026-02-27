const DEFAULT_INCLUDED_ISSUANCES = 20000;

function normalizeNumber(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return number;
}

function formatUsageMonth(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

export function computeBillingAllowance(input = {}) {
  const included = Math.max(0, Math.floor(normalizeNumber(input.monthlyIncludedIssuances, DEFAULT_INCLUDED_ISSUANCES)));
  const currentUsage = Math.max(0, Math.floor(normalizeNumber(input.currentIssuances, 0)));
  const requestedUnits = Math.max(1, Math.floor(normalizeNumber(input.requestedUnits, 1)));
  const enforcementEnabled = input.enforcementEnabled !== false;
  const hardBlockIssuance = input.hardBlockIssuance === true;

  const projectedUsage = currentUsage + requestedUnits;
  const overageUnits = Math.max(0, projectedUsage - included);
  const inOverage = projectedUsage > included;
  const blocked = enforcementEnabled && hardBlockIssuance && inOverage;

  return {
    allowed: !blocked,
    blocked,
    reason: blocked ? "BILLING_ENFORCED_OVER_LIMIT" : null,
    usageMonth: input.usageMonth || formatUsageMonth(input.now instanceof Date ? input.now : new Date()),
    included,
    currentUsage,
    requestedUnits,
    projectedUsage,
    overageUnits,
    inOverage,
    enforcementEnabled,
    hardBlockIssuance,
  };
}

export async function getAccountBillingState(supabase, accountId) {
  const { data, error } = await supabase
    .from("accounts")
    .select("id,enforcement_enabled,hard_block_issuance,monthly_included_issuances")
    .eq("id", accountId)
    .maybeSingle();

  if (error) throw new Error(error.message || "Failed to load account billing state");
  if (!data) throw new Error("Account not found");

  return {
    accountId: data.id,
    enforcementEnabled: data.enforcement_enabled !== false,
    hardBlockIssuance: data.hard_block_issuance === true,
    monthlyIncludedIssuances: normalizeNumber(data.monthly_included_issuances, DEFAULT_INCLUDED_ISSUANCES),
  };
}

export async function getUsageRow(supabase, accountId, usageMonth) {
  const { data, error } = await supabase
    .from("account_usage_monthly")
    .select("id,issuances_count,overage_count,blocked_count")
    .eq("account_id", accountId)
    .eq("usage_month", usageMonth)
    .maybeSingle();

  if (error) throw new Error(error.message || "Failed to load monthly usage");
  return data || null;
}

export async function recordUsageDecision(supabase, input) {
  const usageMonth = input.usageMonth || formatUsageMonth(new Date());
  const existing = await getUsageRow(supabase, input.accountId, usageMonth);
  const currentIssuances = Math.max(0, normalizeNumber(existing?.issuances_count, 0));
  const currentOverage = Math.max(0, normalizeNumber(existing?.overage_count, 0));
  const currentBlocked = Math.max(0, normalizeNumber(existing?.blocked_count, 0));

  const decision = computeBillingAllowance({
    monthlyIncludedIssuances: input.monthlyIncludedIssuances,
    currentIssuances,
    requestedUnits: input.requestedUnits,
    enforcementEnabled: input.enforcementEnabled,
    hardBlockIssuance: input.hardBlockIssuance,
    usageMonth,
  });

  const nextIssuances = decision.allowed ? currentIssuances + decision.requestedUnits : currentIssuances;
  const nextOverage = decision.allowed
    ? Math.max(0, nextIssuances - decision.included)
    : currentOverage;
  const nextBlocked = decision.allowed ? currentBlocked : currentBlocked + 1;

  const { error } = await supabase
    .from("account_usage_monthly")
    .upsert({
      account_id: input.accountId,
      usage_month: usageMonth,
      issuances_count: nextIssuances,
      overage_count: nextOverage,
      blocked_count: nextBlocked,
      last_issued_at: decision.allowed ? new Date().toISOString() : null,
    }, { onConflict: "account_id,usage_month" });

  if (error) throw new Error(error.message || "Failed to save monthly usage");

  return {
    ...decision,
    postDecision: {
      issuancesCount: nextIssuances,
      overageCount: nextOverage,
      blockedCount: nextBlocked,
    },
  };
}

export async function checkIssuanceAllowance(supabase, input) {
  const account = await getAccountBillingState(supabase, input.accountId);
  const usageMonth = input.usageMonth || formatUsageMonth(new Date());
  const usageRow = await getUsageRow(supabase, input.accountId, usageMonth);
  return computeBillingAllowance({
    ...account,
    requestedUnits: input.requestedUnits || 1,
    currentIssuances: usageRow?.issuances_count || 0,
    usageMonth,
  });
}

export async function recordSuccessfulIssuance(supabase, input) {
  const account = await getAccountBillingState(supabase, input.accountId);
  return recordUsageDecision(supabase, {
    ...account,
    accountId: input.accountId,
    requestedUnits: input.requestedUnits || 1,
    usageMonth: input.usageMonth,
    hardBlockIssuance: false,
  });
}

export async function enforceAndRecordIssuance(supabase, input) {
  const decision = await checkIssuanceAllowance(supabase, input);
  if (!decision.allowed) return decision;
  return recordSuccessfulIssuance(supabase, input);
}

export { DEFAULT_INCLUDED_ISSUANCES, formatUsageMonth };
