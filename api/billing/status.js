import { getAuthenticatedUser, rejectDisallowedOrigin, setJsonCors } from "../../lib/apiAuth.js";
import { getSupabaseAdmin } from "../../lib/ghlIntegration.js";
import { getCheckoutEnvContract } from "../../lib/threadA/checkoutProvider.js";
import {
  getBillingCheckoutPauseMessage,
  isBillingCheckoutDisabled,
} from "../../lib/threadA/checkoutPause.js";
import {
  computeBillingGateState,
  ensureAccountSubscription,
} from "../../lib/threadA/accountSubscription.js";
import { getRequestedAccountId, resolveOrganizationAccess } from "../../lib/organizationAccess.js";

export default async function handler(req, res) {
  const cors = setJsonCors(req, res, ["GET", "OPTIONS"]);
  if (req.method === "OPTIONS") return cors.originAllowed
    ? res.status(204).end()
    : res.status(403).json({ ok: false, error: "Origin not allowed" });
  if (rejectDisallowedOrigin(res, cors)) return;
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth.user) {
      return res.status(auth.status).json({ ok: false, error: auth.error });
    }

    const supabase = getSupabaseAdmin();
    const access = await resolveOrganizationAccess(supabase, auth.user, getRequestedAccountId(req));
    const account = access.activeAccount;
    const subscription = await ensureAccountSubscription(supabase, account.id);
    const gate = computeBillingGateState({ account, subscription });
    const checkoutEnv = getCheckoutEnvContract(process.env);
    const checkoutPaused = isBillingCheckoutDisabled(process.env);

    return res.status(200).json({
      ok: true,
      accountId: account.id,
      accountSlug: account.slug,
      organizationId: access.organization?.id || null,
      organizationType: access.organization?.type || "solo",
      organizationPlanCode: access.organization?.plan_code || subscription.plan_code,
      workspaceCount: Array.isArray(access.accounts) ? access.accounts.length : 1,
      subscriptionId: subscription.id,
      provider: subscription.provider,
      planCode: access.organization?.plan_code || subscription.plan_code,
      canAccessDashboard: gate.canAccessDashboard,
      requiresPayment: gate.requiresPayment,
      trialActive: gate.trialActive,
      trialEndsAt: gate.trialEndsAt,
      subscriptionStatus: gate.subscriptionStatus,
      accountBillingState: gate.accountBillingState,
      cancelAtPeriodEnd: gate.cancelAtPeriodEnd,
      cancelRequestedAt: gate.cancelRequestedAt,
      cancellationPending: gate.cancellationPending,
      cancellationEffective: gate.cancellationEffective,
      accessEndsAt: gate.accessEndsAt,
      exitSurvey: gate.exitSurvey,
      checkoutPaused,
      checkoutPauseMessage: checkoutPaused ? getBillingCheckoutPauseMessage() : null,
      squareApplicationId: checkoutEnv.provider === "square"
        ? checkoutEnv.square.applicationId || null
        : null,
      squareLocationId: checkoutEnv.provider === "square"
        ? checkoutEnv.square.locationId || null
        : null,
      squareEnvironment: checkoutEnv.provider === "square"
        ? checkoutEnv.square.environment || "sandbox"
        : null,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
