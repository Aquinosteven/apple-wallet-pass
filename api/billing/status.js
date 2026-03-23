import { getAuthenticatedUser, setJsonCors } from "../../lib/apiAuth.js";
import { getSupabaseAdmin } from "../../lib/ghlIntegration.js";
import {
  computeBillingGateState,
  ensureAccountSubscription,
  ensureOwnedAccount,
} from "../../lib/threadA/accountSubscription.js";

export default async function handler(req, res) {
  setJsonCors(res, ["GET", "OPTIONS"]);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth.user) {
      return res.status(auth.status).json({ ok: false, error: auth.error });
    }

    const supabase = getSupabaseAdmin();
    const account = await ensureOwnedAccount(supabase, auth.user);
    const subscription = await ensureAccountSubscription(supabase, account.id);
    const gate = computeBillingGateState({ account, subscription });

    return res.status(200).json({
      ok: true,
      accountId: account.id,
      accountSlug: account.slug,
      subscriptionId: subscription.id,
      provider: subscription.provider,
      planCode: subscription.plan_code,
      canAccessDashboard: gate.canAccessDashboard,
      requiresPayment: gate.requiresPayment,
      trialActive: gate.trialActive,
      trialEndsAt: gate.trialEndsAt,
      subscriptionStatus: gate.subscriptionStatus,
      accountBillingState: gate.accountBillingState,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
