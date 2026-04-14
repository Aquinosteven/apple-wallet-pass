function normalizeText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

export function isBillingCheckoutDisabled(env = process.env) {
  return normalizeText(env.DISABLE_BILLING_CHECKOUT || "true").toLowerCase() !== "false";
}

export function getBillingCheckoutPauseMessage() {
  return "Checkout is temporarily paused while we roll out the next onboarding wave. Join the waitlist instead.";
}
