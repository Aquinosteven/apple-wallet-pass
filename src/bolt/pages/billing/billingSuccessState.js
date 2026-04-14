export function getBillingSuccessViewModel({
  statusResolved,
  canAccessDashboard,
  requiresSignIn,
  plan,
}) {
  const normalizedPlan = typeof plan === "string" && plan ? plan : "solo_monthly_v1";
  const billingHref = `/login?plan=${encodeURIComponent(normalizedPlan)}`;
  const signInHref = "/login";
  const showBillingCta = statusResolved && !canAccessDashboard;
  const showDashboardCta = statusResolved && canAccessDashboard;

  if (showDashboardCta) {
    return {
      primaryLabel: "Go to dashboard",
      primaryHref: null,
      secondaryLabel: "Back to billing",
      secondaryHref: billingHref,
    };
  }

  if (showBillingCta) {
    if (requiresSignIn) {
      return {
        primaryLabel: "Sign in to continue",
        primaryHref: signInHref,
        secondaryLabel: "Back to billing",
        secondaryHref: billingHref,
      };
    }

    return {
      primaryLabel: "Return to billing",
      primaryHref: billingHref,
      secondaryLabel: "Go home",
      secondaryHref: "/",
    };
  }

  return {
    primaryLabel: "Sign in to continue",
    primaryHref: signInHref,
    secondaryLabel: "Back to billing",
    secondaryHref: billingHref,
  };
}
