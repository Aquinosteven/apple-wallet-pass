export interface BillingSuccessViewModel {
  primaryLabel: string;
  primaryHref: string | null;
  secondaryLabel: string;
  secondaryHref: string;
}

export function getBillingSuccessViewModel(input: {
  statusResolved: boolean;
  canAccessDashboard: boolean;
  requiresSignIn: boolean;
  plan: string | null;
}): BillingSuccessViewModel;
