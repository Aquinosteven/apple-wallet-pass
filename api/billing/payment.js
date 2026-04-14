import { getAuthenticatedUser, rejectDisallowedOrigin, setJsonCors } from "../../lib/apiAuth.js";
import { getSupabaseAdmin } from "../../lib/ghlIntegration.js";
import { readJsonBodyStrict, validateStringField } from "../../lib/requestValidation.js";
import {
  ensureAccountSubscription,
} from "../../lib/threadA/accountSubscription.js";
import {
  getBillingCheckoutPauseMessage,
  isBillingCheckoutDisabled,
} from "../../lib/threadA/checkoutPause.js";
import { createCheckoutProvider } from "../../lib/threadA/checkoutProvider.js";
import { getPlanByCode, getPlanPeriodEnd } from "../../lib/threadA/plans.js";
import { getRequestedAccountId, resolveOrganizationAccess } from "../../lib/organizationAccess.js";

function normalizeText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function mapPaymentStatusToSubscriptionStatus(status) {
  const normalized = normalizeText(status).toLowerCase();
  if (normalized === "active") return "active";
  if (normalized === "pending") return "inactive";
  if (normalized === "failed") return "past_due";
  if (normalized === "canceled" || normalized === "cancelled") return "canceled";
  return "inactive";
}

function mapSubscriptionToBillingState(status) {
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

    if (isBillingCheckoutDisabled(process.env)) {
      return res.status(409).json({
        ok: false,
        error: getBillingCheckoutPauseMessage(),
      });
    }

    const parsed = await readJsonBodyStrict(req);
    if (!parsed.ok) {
      return res.status(parsed.status).json({ ok: false, error: parsed.error });
    }

    const body = parsed.body && typeof parsed.body === "object" ? parsed.body : {};
    const planCode = normalizeText(body.planCode);
    const plan = getPlanByCode(planCode);
    if (!plan) {
      return res.status(400).json({ ok: false, error: "Unsupported planCode" });
    }

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
    const access = await resolveOrganizationAccess(supabase, auth.user, getRequestedAccountId(req));
    const account = access.activeAccount;
    const subscription = await ensureAccountSubscription(supabase, account.id);
    if (normalizeText(subscription.status).toLowerCase() === "active") {
      return res.status(409).json({ ok: false, error: "Subscription is already active." });
    }

    const checkoutProvider = createCheckoutProvider({ env: process.env });
    const payment = await checkoutProvider.createPayment({
      accountId: account.id,
      planCode: plan.code,
      sourceId: sourceId.value,
      buyerEmailAddress: auth.user.email || "",
      buyerName:
        normalizeText(auth.user.user_metadata?.full_name)
        || normalizeText(auth.user.user_metadata?.name)
        || normalizeText(auth.user.email),
      existingCustomerId: subscription.provider_customer_id || null,
      verificationToken: normalizeText(body.verificationToken),
    });

    if (!payment.live || !payment.subscriptionId) {
      return res.status(409).json({
        ok: false,
        provider: payment.provider || checkoutProvider.provider,
        error: payment.error || "PAYMENT_NOT_AVAILABLE",
      });
    }

    const nextStatus = mapPaymentStatusToSubscriptionStatus(payment.status);
    const nowIso = new Date().toISOString();
    const currentMetadata = subscription.metadata && typeof subscription.metadata === "object"
      ? subscription.metadata
      : {};

    const { error: subscriptionError } = await supabase
      .from("account_subscriptions")
      .update({
        provider: payment.provider || "square",
        provider_customer_id: payment.customerId || subscription.provider_customer_id || null,
        provider_subscription_id: payment.subscriptionId,
        plan_code: plan.code,
        status: nextStatus,
        current_period_start: nowIso,
        current_period_end: nextStatus === "active"
          ? getPlanPeriodEnd(plan.code, new Date(nowIso))
          : null,
        metadata: {
          ...currentMetadata,
          square_card_id: payment.cardId || currentMetadata.square_card_id || null,
          square_cancel_action_id: payment.cancelActionId || null,
          last_subscription_status: payment.status || null,
          last_subscription_event_at: nowIso,
          paid_until_date: payment.paidUntilDate || null,
          charged_through_date: payment.chargedThroughDate || null,
          pending_checkout_session_id: null,
          pending_checkout_payment_link_id: null,
          pending_checkout_order_id: null,
          pending_checkout_plan_code: null,
        },
      })
      .eq("id", subscription.id);

    if (subscriptionError) {
      throw new Error(subscriptionError.message || "Failed to update subscription");
    }

    const { error: accountError } = await supabase
      .from("accounts")
      .update({
        billing_state: mapSubscriptionToBillingState(nextStatus),
        updated_at: nowIso,
      })
      .eq("id", account.id);

    if (accountError) {
      throw new Error(accountError.message || "Failed to update account billing state");
    }

    return res.status(200).json({
      ok: true,
      provider: payment.provider,
      paymentId: payment.subscriptionId,
      orderId: null,
      receiptUrl: null,
      status: payment.status || null,
      accountId: account.id,
      planCode: plan.code,
      canAccessDashboard: nextStatus === "active",
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
