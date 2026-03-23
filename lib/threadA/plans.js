export const BILLING_PLANS = {
  core_monthly_v1: {
    code: "core_monthly_v1",
    label: "Core Monthly",
    amountCents: 4900,
    cadence: "monthly",
  },
  core_yearly_v1: {
    code: "core_yearly_v1",
    label: "Core Yearly",
    amountCents: 46800,
    cadence: "yearly",
  },
};

export function getPlanByCode(planCode) {
  if (!planCode || typeof planCode !== "string") return null;
  return BILLING_PLANS[planCode] || null;
}

export function getDefaultPlanCode() {
  return "core_monthly_v1";
}
