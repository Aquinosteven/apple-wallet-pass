export type CheckoutPlanCode =
  | 'solo_monthly_v1'
  | 'solo_yearly_v1'
  | 'agency_monthly_v1'
  | 'agency_yearly_v1';

export const defaultCheckoutPlan: CheckoutPlanCode = 'solo_monthly_v1';

export function getCheckoutHref(planCode: CheckoutPlanCode = defaultCheckoutPlan) {
  return `/login?mode=signup&plan=${encodeURIComponent(planCode)}`;
}
