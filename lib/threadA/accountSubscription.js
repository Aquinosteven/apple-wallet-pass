function normalizeText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeSlugPart(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

function randomSlugSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

function extractEmailPrefix(email) {
  const normalized = normalizeText(email).toLowerCase();
  if (!normalized.includes("@")) return "showfi";
  return normalizeSlugPart(normalized.split("@")[0]) || "showfi";
}

function toIsoDate(value) {
  if (!value) return null;
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  } catch {
    return null;
  }
}

function trialEndsAtFromAccount(account, trialDays = 14) {
  const createdAt = toIsoDate(account?.created_at) || new Date().toISOString();
  const created = new Date(createdAt);
  created.setUTCDate(created.getUTCDate() + trialDays);
  return created.toISOString();
}

function isMissingRelationError(error) {
  const message = String(error?.message || "").toLowerCase();
  const details = String(error?.details || "").toLowerCase();
  return message.includes("does not exist")
    || message.includes("could not find the table")
    || details.includes("does not exist");
}

async function createAccountForOwner(supabase, user) {
  const baseSlug = extractEmailPrefix(user?.email || user?.id || "showfi");
  const name = normalizeText(user?.user_metadata?.full_name)
    || normalizeText(user?.user_metadata?.name)
    || normalizeText(user?.email)
    || "ShowFi Account";

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const suffix = attempt === 0 ? "" : `-${randomSlugSuffix()}`;
    const slug = `${baseSlug}${suffix}`;

    const { data, error } = await supabase
      .from("accounts")
      .insert({
        owner_user_id: user.id,
        slug,
        name,
      })
      .select("id,owner_user_id,slug,name,billing_state,created_at,updated_at")
      .single();

    if (!error && data) {
      return data;
    }

    if (!String(error?.message || "").toLowerCase().includes("duplicate") && !String(error?.code || "").includes("23505")) {
      throw new Error(error?.message || "Failed to create account");
    }
  }

  const fallback = await supabase
    .from("accounts")
    .select("id,owner_user_id,slug,name,billing_state,created_at,updated_at")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (fallback.error) {
    throw new Error(fallback.error.message || "Failed to create account");
  }
  if (!fallback.data) {
    throw new Error("Failed to resolve account after create retries");
  }

  return fallback.data;
}

export async function ensureOwnedAccount(supabase, user) {
  const { data, error } = await supabase
    .from("accounts")
    .select("id,owner_user_id,slug,name,billing_state,created_at,updated_at")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Failed to load account");
  }

  if (data) {
    return data;
  }

  return createAccountForOwner(supabase, user);
}

export async function ensureAccountSubscription(supabase, accountId) {
  const { data, error } = await supabase
    .from("account_subscriptions")
    .select("id,account_id,provider,provider_customer_id,provider_subscription_id,plan_code,status,metadata,current_period_start,current_period_end,created_at,updated_at")
    .eq("account_id", accountId)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      return {
        id: `stub:${accountId}`,
        account_id: accountId,
        provider: "stub",
        provider_customer_id: null,
        provider_subscription_id: null,
        plan_code: "core_v1",
        status: "inactive",
        metadata: {},
        current_period_start: null,
        current_period_end: null,
        created_at: null,
        updated_at: null,
      };
    }
    throw new Error(error.message || "Failed to load subscription");
  }

  if (data) {
    return data;
  }

  const { data: created, error: createError } = await supabase
    .from("account_subscriptions")
    .insert({
      account_id: accountId,
      provider: "stub",
      provider_customer_id: `stub_customer:${accountId}`,
      provider_subscription_id: `stub_subscription:${accountId}`,
      plan_code: "core_v1",
      status: "inactive",
      metadata: {},
    })
    .select("id,account_id,provider,provider_customer_id,provider_subscription_id,plan_code,status,metadata,current_period_start,current_period_end,created_at,updated_at")
    .single();

  if (createError || !created) {
    if (isMissingRelationError(createError)) {
      return {
        id: `stub:${accountId}`,
        account_id: accountId,
        provider: "stub",
        provider_customer_id: null,
        provider_subscription_id: null,
        plan_code: "core_v1",
        status: "inactive",
        metadata: {},
        current_period_start: null,
        current_period_end: null,
        created_at: null,
        updated_at: null,
      };
    }
    throw new Error(createError?.message || "Failed to initialize subscription");
  }

  return created;
}

function isActiveSubscriptionStatus(status) {
  return ["active"].includes(normalizeText(status).toLowerCase());
}

export function computeBillingGateState({ account, subscription, now = new Date(), trialDays = 14 }) {
  const subscriptionStatus = normalizeText(subscription?.status).toLowerCase() || "inactive";
  const accountBillingState = normalizeText(account?.billing_state).toLowerCase() || "trial";

  const metadata = subscription?.metadata && typeof subscription.metadata === "object"
    ? subscription.metadata
    : {};

  const trialEndsAt = toIsoDate(metadata.trial_ends_at) || trialEndsAtFromAccount(account, trialDays);
  const trialActive = Boolean(trialEndsAt && new Date(trialEndsAt).getTime() > now.getTime());
  const subscriptionActive = isActiveSubscriptionStatus(subscriptionStatus);

  const canAccessDashboard = subscriptionActive || accountBillingState === "active" || trialActive;

  return {
    accountBillingState,
    subscriptionStatus,
    subscriptionActive,
    trialEndsAt,
    trialActive,
    requiresPayment: !canAccessDashboard,
    canAccessDashboard,
  };
}
