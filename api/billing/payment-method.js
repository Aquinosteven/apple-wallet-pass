import { getAuthenticatedUser, rejectDisallowedOrigin, setJsonCors } from "../../lib/apiAuth.js";
import { getSupabaseAdmin } from "../../lib/ghlIntegration.js";
import { readJsonBodyStrict, validateStringField } from "../../lib/requestValidation.js";
import {
  ensureAccountSubscription,
  ensureOwnedAccount,
} from "../../lib/threadA/accountSubscription.js";
import { createCheckoutProvider } from "../../lib/threadA/checkoutProvider.js";

function normalizeText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function mapSubscriptionStatusToBillingState(status) {
  const normalized = normalizeText(status).toLowerCase();
  if (normalized === "active") return "active";
  if (normalized === "past_due") return "past_due";
  if (normalized === "canceled") return "canceled";
  return "trial";
}

export default async function handler(req, res) {
  const cors = setJsonCors(req, res, ["POST", "OPTIONS"]);
  if (req.method === "OPTIONS") return cors.originAllowed
    ? res.status(204).end()
    : res.status(403).json({ ok: false, error: "Origin not allowed" });
  if (rejectDisallowedOrigin(res, cors)) return;
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth.user) {
      return res.status(auth.status).json({ ok: false, error: auth.error });
    }

    const parsed = await readJsonBodyStrict(req);
    if (!parsed.ok) {
      return res.status(parsed.status).json({ ok: false, error: parsed.error });
    }

    const body = parsed.body && typeof parsed.body === "object" ? parsed.body : {};
    const sourceId = validateStringField(body.sourceId, {
      field: "sourceId",
      required: true,
      min: 4,
      max: 255,
    });
    if (!sourceId.ok) {
      return res.status(400).json({ ok: false, error: sourceId.error });
    }

    const supabase = getSupabaseAdmin();
    const account = await ensureOwnedAccount(supabase, auth.user);
    const subscription = await ensureAccountSubscription(supabase, account.id);
    const metadata = subscription.metadata && typeof subscription.metadata === "object"
      ? subscription.metadata
      : {};

    if (subscription.provider !== "square") {
      return res.status(409).json({ ok: false, error: "Only Square subscriptions support in-app card updates." });
    }
    if (!subscription.provider_subscription_id || !subscription.provider_customer_id) {
      return res.status(409).json({ ok: false, error: "Subscription billing record is incomplete." });
    }

    const checkoutProvider = createCheckoutProvider({ env: process.env, provider: "square" });
    const result = await checkoutProvider.updateSubscriptionCard({
      subscriptionId: subscription.provider_subscription_id,
      customerId: subscription.provider_customer_id,
      sourceId: sourceId.value,
      verificationToken: normalizeText(body.verificationToken),
      buyerName:
        normalizeText(auth.user.user_metadata?.full_name)
        || normalizeText(auth.user.user_metadata?.name)
        || normalizeText(auth.user.email),
    });

    if (!result.ok || !result.cardId) {
      return res.status(409).json({ ok: false, error: result.error || "PAYMENT_METHOD_UPDATE_FAILED" });
    }

    const nowIso = new Date().toISOString();
    const nextStatus = normalizeText(result.status).toLowerCase() || normalizeText(subscription.status).toLowerCase() || "active";
    const { error: subscriptionError } = await supabase
      .from("account_subscriptions")
      .update({
        status: nextStatus,
        provider_customer_id: result.customerId || subscription.provider_customer_id,
        provider_subscription_id: result.subscriptionId || subscription.provider_subscription_id,
        metadata: {
          ...metadata,
          square_card_id: result.cardId,
          paid_until_date: result.paidUntilDate || metadata.paid_until_date || null,
          charged_through_date: result.chargedThroughDate || metadata.charged_through_date || null,
          last_payment_method_update_at: nowIso,
        },
      })
      .eq("id", subscription.id);

    if (subscriptionError) {
      throw new Error(subscriptionError.message || "Failed to update subscription payment method");
    }

    const { error: accountError } = await supabase
      .from("accounts")
      .update({
        billing_state: mapSubscriptionStatusToBillingState(nextStatus),
        updated_at: nowIso,
      })
      .eq("id", account.id);

    if (accountError) {
      throw new Error(accountError.message || "Failed to refresh billing state");
    }

    return res.status(200).json({
      ok: true,
      cardId: result.cardId,
      subscriptionId: result.subscriptionId || subscription.provider_subscription_id,
      status: result.status || subscription.status,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
