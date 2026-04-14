import { ensureAccountSubscription, ensureOwnedAccount } from "./threadA/accountSubscription.js";

const INTERNAL_AGENCY_EMAILS = new Set([
  "access@badmarketing.com",
]);

const LEGACY_PLAN_CODE_MAP = {
  core_monthly_v1: "solo_monthly_v1",
  core_yearly_v1: "solo_yearly_v1",
  free_access_v1: "internal_agency_free_v1",
};

function normalizeText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeSlugPart(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function randomSlugSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

function isMissingRelationError(error) {
  const message = String(error?.message || "").toLowerCase();
  const details = String(error?.details || "").toLowerCase();
  return message.includes("does not exist")
    || message.includes("could not find the table")
    || details.includes("does not exist");
}

function mapLegacyPlanCode(planCode, email = "") {
  const normalizedCode = normalizeText(planCode);
  if (LEGACY_PLAN_CODE_MAP[normalizedCode]) {
    return LEGACY_PLAN_CODE_MAP[normalizedCode];
  }

  if (INTERNAL_AGENCY_EMAILS.has(normalizeEmail(email))) {
    return "internal_agency_free_v1";
  }

  return "solo_monthly_v1";
}

function inferOrganizationType({ email }) {
  if (INTERNAL_AGENCY_EMAILS.has(normalizeEmail(email))) {
    return "agency";
  }
  return "solo";
}

function inferOrganizationName(account, user) {
  const email = normalizeEmail(user?.email || "");
  if (INTERNAL_AGENCY_EMAILS.has(email)) {
    return "Bad Marketing";
  }

  return normalizeText(account?.name)
    || normalizeText(user?.user_metadata?.full_name)
    || normalizeText(user?.user_metadata?.name)
    || normalizeText(user?.email)
    || "ShowFi Organization";
}

async function createOrganizationForAccount(supabase, account, user) {
  const subscription = await ensureAccountSubscription(supabase, account.id);
  const organizationType = inferOrganizationType({ email: user?.email });
  const baseSlug = normalizeSlugPart(account?.slug || user?.email || user?.id || "showfi");
  const planCode = organizationType === "agency" && INTERNAL_AGENCY_EMAILS.has(normalizeEmail(user?.email))
    ? "internal_agency_free_v1"
    : mapLegacyPlanCode(subscription?.plan_code, user?.email);
  const billingState = organizationType === "agency" && INTERNAL_AGENCY_EMAILS.has(normalizeEmail(user?.email))
    ? "active"
    : normalizeText(account?.billing_state || "trial") || "trial";

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const suffix = attempt === 0 ? "" : `-${randomSlugSuffix()}`;
    const slug = `${baseSlug}${suffix}`;
    const payload = {
      name: inferOrganizationName(account, user),
      slug,
      type: organizationType,
      billing_state: billingState,
      plan_code: planCode,
      metadata: INTERNAL_AGENCY_EMAILS.has(normalizeEmail(user?.email))
        ? { internal_account: true, internal_access: "permanent_free" }
        : {},
    };

    const { data, error } = await supabase
      .from("organizations")
      .insert(payload)
      .select("id,name,slug,type,billing_state,plan_code,metadata,created_at,updated_at")
      .single();

    if (!error && data) {
      return data;
    }

    if (!String(error?.code || "")?.includes("23505")) {
      throw new Error(error?.message || "Failed to create organization");
    }
  }

  throw new Error("Failed to create organization after retries");
}

async function ensureOrganizationMembership(supabase, organizationId, userId, role = "owner") {
  const { error } = await supabase
    .from("organization_members")
    .upsert({
      organization_id: organizationId,
      user_id: userId,
      role,
    }, { onConflict: "organization_id,user_id" });

  if (error && !isMissingRelationError(error)) {
    throw new Error(error.message || "Failed to save organization membership");
  }
}

export function getRequestedAccountId(req) {
  const headerValue = normalizeText(
    req?.headers?.["x-showfi-account-id"]
      || req?.headers?.["X-SHOWFI-ACCOUNT-ID"]
      || ""
  );
  if (headerValue) return headerValue;

  const queryValue = normalizeText(req?.query?.accountId || "");
  return queryValue || null;
}

export async function ensureOrganizationContext(supabase, user) {
  const account = await ensureOwnedAccount(supabase, user);
  const hasOrganizationColumnCheck = await supabase
    .from("accounts")
    .select("id,organization_id,is_primary_workspace,workspace_kind,workspace_status")
    .eq("id", account.id)
    .maybeSingle();

  if (hasOrganizationColumnCheck.error && isMissingRelationError(hasOrganizationColumnCheck.error)) {
    const subscription = await ensureAccountSubscription(supabase, account.id);
    return {
      organization: {
        id: `legacy:${account.id}`,
        name: inferOrganizationName(account, user),
        slug: account.slug,
        type: inferOrganizationType({ email: user?.email }),
        billing_state: account.billing_state,
        plan_code: mapLegacyPlanCode(subscription?.plan_code, user?.email),
        metadata: {},
      },
      activeAccount: {
        ...account,
        organization_id: null,
        is_primary_workspace: true,
        workspace_kind: "primary",
        workspace_status: "active",
      },
      accounts: [{
        ...account,
        organization_id: null,
        is_primary_workspace: true,
        workspace_kind: "primary",
        workspace_status: "active",
      }],
      membershipRole: "owner",
      legacyMode: true,
    };
  }

  let accountRecord = hasOrganizationColumnCheck.data
    ? { ...account, ...hasOrganizationColumnCheck.data }
    : { ...account, organization_id: null, is_primary_workspace: true, workspace_kind: "primary", workspace_status: "active" };

  let organization = null;
  if (accountRecord.organization_id) {
    const { data, error } = await supabase
      .from("organizations")
      .select("id,name,slug,type,billing_state,plan_code,metadata,created_at,updated_at")
      .eq("id", accountRecord.organization_id)
      .maybeSingle();
    if (error && !isMissingRelationError(error)) {
      throw new Error(error.message || "Failed to load organization");
    }
    organization = data || null;
  }

  if (!organization) {
    organization = await createOrganizationForAccount(supabase, account, user);
    const { error: accountUpdateError } = await supabase
      .from("accounts")
      .update({
        organization_id: organization.id,
        is_primary_workspace: true,
        workspace_kind: "primary",
        workspace_status: "active",
      })
      .eq("id", account.id);

    if (accountUpdateError && !isMissingRelationError(accountUpdateError)) {
      throw new Error(accountUpdateError.message || "Failed to link account to organization");
    }

    accountRecord = {
      ...accountRecord,
      organization_id: organization.id,
      is_primary_workspace: true,
      workspace_kind: "primary",
      workspace_status: "active",
    };
  }

  await ensureOrganizationMembership(supabase, organization.id, user.id, "owner");

  return {
    organization,
    activeAccount: accountRecord,
    accounts: [accountRecord],
    membershipRole: "owner",
    legacyMode: false,
  };
}

export async function resolveOrganizationAccess(supabase, user, requestedAccountId = null) {
  const baseContext = await ensureOrganizationContext(supabase, user);
  if (baseContext.legacyMode || !baseContext.organization?.id || String(baseContext.organization.id).startsWith("legacy:")) {
    return {
      ...baseContext,
      organizationId: baseContext.organization?.id || null,
      requiresWorkspaceSelection: false,
    };
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from("organization_members")
    .select("organization_id,role")
    .eq("user_id", user.id);

  if (membershipsError && !isMissingRelationError(membershipsError)) {
    throw new Error(membershipsError.message || "Failed to load organization memberships");
  }

  const organizationIds = Array.from(new Set((memberships || []).map((row) => row.organization_id).filter(Boolean)));
  if (!organizationIds.length) {
    return {
      ...baseContext,
      organizationId: baseContext.organization.id,
      requiresWorkspaceSelection: false,
    };
  }

  const { data: accounts, error: accountsError } = await supabase
    .from("accounts")
    .select("id,owner_user_id,organization_id,slug,name,billing_state,enforcement_enabled,hard_block_issuance,monthly_included_issuances,created_at,updated_at,is_primary_workspace,workspace_kind,workspace_status")
    .in("organization_id", organizationIds)
    .order("created_at", { ascending: true });

  if (accountsError && !isMissingRelationError(accountsError)) {
    throw new Error(accountsError.message || "Failed to load organization workspaces");
  }

  const accessibleAccounts = (accounts || []).filter((account) => account.organization_id === baseContext.organization.id);
  const preferredAccountId = normalizeText(requestedAccountId || "");
  const fallbackPrimary = accessibleAccounts.find((account) => account.is_primary_workspace)
    || accessibleAccounts.find((account) => account.owner_user_id === user.id)
    || accessibleAccounts[0]
    || baseContext.activeAccount;
  const activeAccount = accessibleAccounts.find((account) => account.id === preferredAccountId) || fallbackPrimary;
  const membershipRole = (memberships || []).find((row) => row.organization_id === baseContext.organization.id)?.role || baseContext.membershipRole;

  return {
    organization: baseContext.organization,
    organizationId: baseContext.organization.id,
    membershipRole,
    accounts: accessibleAccounts.length ? accessibleAccounts : [baseContext.activeAccount],
    activeAccount,
    requiresWorkspaceSelection: baseContext.organization.type === "agency" && accessibleAccounts.length > 1 && !preferredAccountId,
    legacyMode: false,
  };
}

export async function createWorkspaceForOrganization(supabase, { organization, ownerUser, name }) {
  const baseSlug = normalizeSlugPart(name || "workspace") || "workspace";
  let createdAccount = null;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const suffix = attempt === 0 ? "" : `-${randomSlugSuffix()}`;
    const slug = `${baseSlug}${suffix}`;
    const { data, error } = await supabase
      .from("accounts")
      .insert({
        organization_id: organization.id,
        owner_user_id: ownerUser.id,
        slug,
        name: normalizeText(name) || "Client Workspace",
        billing_state: normalizeText(organization.billing_state || "active") || "active",
        is_primary_workspace: false,
        workspace_kind: "client",
        workspace_status: "active",
      })
      .select("id,owner_user_id,organization_id,slug,name,billing_state,enforcement_enabled,hard_block_issuance,monthly_included_issuances,created_at,updated_at,is_primary_workspace,workspace_kind,workspace_status")
      .single();

    if (!error && data) {
      createdAccount = data;
      break;
    }

    if (!String(error?.code || "")?.includes("23505")) {
      throw new Error(error?.message || "Failed to create workspace");
    }
  }

  if (!createdAccount) {
    throw new Error("Failed to create workspace after retries");
  }

  const { data: primaryWorkspace, error: primaryWorkspaceError } = await supabase
    .from("accounts")
    .select("id")
    .eq("organization_id", organization.id)
    .eq("is_primary_workspace", true)
    .maybeSingle();

  if (primaryWorkspaceError && !isMissingRelationError(primaryWorkspaceError)) {
    throw new Error(primaryWorkspaceError.message || "Failed to load primary workspace");
  }

  let primarySubscription = null;
  let primarySubscriptionError = null;
  if (primaryWorkspace?.id) {
    const loaded = await supabase
      .from("account_subscriptions")
      .select("plan_code,status,metadata")
      .eq("account_id", primaryWorkspace.id)
      .maybeSingle();
    primarySubscription = loaded.data || null;
    primarySubscriptionError = loaded.error || null;
  }

  if (primarySubscriptionError && !isMissingRelationError(primarySubscriptionError)) {
    throw new Error(primarySubscriptionError.message || "Failed to load primary workspace subscription");
  }

  const nextPlanCode = normalizeText(organization.plan_code)
    || normalizeText(primarySubscription?.plan_code)
    || "solo_monthly_v1";
  const nextStatus = normalizeText(primarySubscription?.status)
    || (normalizeText(organization.billing_state) === "active" ? "active" : "inactive");

  const { error: subscriptionError } = await supabase
    .from("account_subscriptions")
    .insert({
      account_id: createdAccount.id,
      provider: "stub",
      provider_customer_id: `org:${organization.id}`,
      provider_subscription_id: `workspace:${createdAccount.id}`,
      plan_code: nextPlanCode,
      status: nextStatus,
      metadata: {
        organization_billing: true,
        organization_plan_code: nextPlanCode,
      },
      current_period_start: new Date().toISOString(),
      current_period_end: null,
    });

  if (subscriptionError && !String(subscriptionError.code || "").includes("23505")) {
    throw new Error(subscriptionError.message || "Failed to initialize workspace subscription");
  }

  return createdAccount;
}
