export const BILLING_PLANS = {
  solo_monthly_v1: {
    code: "solo_monthly_v1",
    label: "Solo Monthly",
    amountCents: 9700,
    cadence: "monthly",
  },
  solo_yearly_v1: {
    code: "solo_yearly_v1",
    label: "Solo Yearly",
    amountCents: 99700,
    cadence: "yearly",
  },
  agency_monthly_v1: {
    code: "agency_monthly_v1",
    label: "Agency Monthly",
    amountCents: 49700,
    cadence: "monthly",
  },
  agency_yearly_v1: {
    code: "agency_yearly_v1",
    label: "Agency Yearly",
    amountCents: 499700,
    cadence: "yearly",
  },
  internal_agency_free_v1: {
    code: "internal_agency_free_v1",
    label: "Internal Agency Free",
    amountCents: 0,
    cadence: "monthly",
  },
};

const LEGACY_PLAN_ALIASES = {
  core_monthly_v1: "solo_monthly_v1",
  core_yearly_v1: "solo_yearly_v1",
  free_access_v1: "internal_agency_free_v1",
};

export function normalizePlanCode(planCode) {
  if (!planCode || typeof planCode !== "string") return "";
  return LEGACY_PLAN_ALIASES[planCode] || planCode;
}

export function getPlanByCode(planCode) {
  const normalized = normalizePlanCode(planCode);
  if (!normalized) return null;
  return BILLING_PLANS[normalized] || null;
}

export function getDefaultPlanCode() {
  return "solo_monthly_v1";
}

export function getPlanPeriodEnd(planCode, startDate = new Date()) {
  const plan = getPlanByCode(planCode);
  if (!plan) return null;

  const nextDate = new Date(startDate);
  if (plan.cadence === "yearly") {
    nextDate.setUTCFullYear(nextDate.getUTCFullYear() + 1);
    return nextDate.toISOString();
  }

  nextDate.setUTCMonth(nextDate.getUTCMonth() + 1);
  return nextDate.toISOString();
}

export function getSquarePlanVariationEnvName(planCode) {
  const normalizedPlanCode = normalizePlanCode(planCode);
  const envAlias = {
    solo_monthly_v1: "CORE_MONTHLY_V1",
    solo_yearly_v1: "CORE_YEARLY_V1",
    internal_agency_free_v1: "FREE_ACCESS_V1",
  }[normalizedPlanCode];

  const normalized = String(envAlias || normalizedPlanCode || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_");

  if (!normalized) return "";
  return `SQUARE_PLAN_VARIATION_ID_${normalized}`;
}
