import { getAuthenticatedUser, rejectDisallowedOrigin, setJsonCors } from "../../lib/apiAuth.js";
import { getSupabaseAdmin } from "../../lib/ghlIntegration.js";
import { isValidHttpUrl, readJsonBodyStrict } from "../../lib/requestValidation.js";
import {
  ensureAccountSubscription,
} from "../../lib/threadA/accountSubscription.js";
import {
  getBillingCheckoutPauseMessage,
  isBillingCheckoutDisabled,
} from "../../lib/threadA/checkoutPause.js";
import { createCheckoutProvider } from "../../lib/threadA/checkoutProvider.js";
import { getDefaultPlanCode, getPlanByCode } from "../../lib/threadA/plans.js";
import { getRequestedAccountId, resolveOrganizationAccess } from "../../lib/organizationAccess.js";

function normalizeText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function pickAllowedUrl(value, fallback) {
  const next = normalizeText(value);
  if (isValidHttpUrl(next)) return next;
  return fallback;
}

function inferBaseUrl(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:3000";
  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${host}`;
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
    const baseUrl = inferBaseUrl(req);
    if (isBillingCheckoutDisabled(process.env)) {
      return res.status(409).json({
        ok: false,
        error: getBillingCheckoutPauseMessage(),
        waitlistUrl: `${baseUrl}/waitlist`,
      });
    }

    const auth = await getAuthenticatedUser(req);
    if (!auth.user) {
      return res.status(auth.status).json({ ok: false, error: auth.error });
    }

    const parsed = await readJsonBodyStrict(req);
    if (!parsed.ok) {
      return res.status(parsed.status).json({ ok: false, error: parsed.error });
    }

    const body = parsed.body && typeof parsed.body === "object" ? parsed.body : {};
    const planCode = normalizeText(body.planCode) || getDefaultPlanCode();
    const plan = getPlanByCode(planCode);
    if (!plan) {
      return res.status(400).json({ ok: false, error: "Unsupported planCode" });
    }

    const successUrl = pickAllowedUrl(body.successUrl, `${baseUrl}/billing/success`);
    const cancelUrl = pickAllowedUrl(body.cancelUrl, `${baseUrl}/billing/cancel`);

    const supabase = getSupabaseAdmin();
    const access = await resolveOrganizationAccess(supabase, auth.user, getRequestedAccountId(req));
    const account = access.activeAccount;
    const currentSubscription = await ensureAccountSubscription(supabase, account.id);

    const checkoutProvider = createCheckoutProvider({ env: process.env });
    const checkoutSession = await checkoutProvider.createCheckoutSession({
      accountId: account.id,
      planCode: plan.code,
      planLabel: plan.label,
      amountCents: plan.amountCents,
      successUrl,
      cancelUrl,
    });

    const nowIso = new Date().toISOString();
    const mergedMetadata = {
      ...(currentSubscription.metadata && typeof currentSubscription.metadata === "object"
        ? currentSubscription.metadata
        : {}),
      pending_checkout_session_id: checkoutSession.sessionId || null,
      pending_checkout_payment_link_id: checkoutSession.paymentLinkId || null,
      pending_checkout_order_id: checkoutSession.orderId || null,
      pending_checkout_plan_code: plan.code,
      pending_checkout_success_url: successUrl,
      pending_checkout_cancel_url: cancelUrl,
      pending_checkout_created_at: nowIso,
      trial_ends_at:
        currentSubscription?.metadata && typeof currentSubscription.metadata === "object"
          ? currentSubscription.metadata.trial_ends_at || null
          : null,
    };

    const updatePayload = {
      provider: checkoutSession.provider || currentSubscription.provider || "square",
      plan_code: plan.code,
      status: currentSubscription.status || "inactive",
      metadata: mergedMetadata,
    };

    if (checkoutSession.live && checkoutSession.checkoutUrl) {
      await supabase
        .from("account_subscriptions")
        .update(updatePayload)
        .eq("id", currentSubscription.id);

      return res.status(200).json({
        ok: true,
        provider: checkoutSession.provider,
        checkoutMode: checkoutSession.checkoutMode || "embedded",
        checkoutUrl: checkoutSession.checkoutUrl,
        sessionId: checkoutSession.sessionId,
        live: checkoutSession.live,
        accountId: account.id,
        planCode: plan.code,
        amountCents: checkoutSession.amountCents || plan.amountCents,
        currency: checkoutSession.currency || "USD",
        squareApplicationId: checkoutSession.squareApplicationId || null,
        squareLocationId: checkoutSession.squareLocationId || null,
        squareEnvironment: checkoutSession.squareEnvironment || null,
      });
    }

    await supabase
      .from("account_subscriptions")
      .update(updatePayload)
      .eq("id", currentSubscription.id);

    return res.status(409).json({
      ok: false,
      provider: checkoutSession.provider,
      checkoutMode: checkoutSession.checkoutMode || "embedded",
      checkoutUrl: null,
      sessionId: checkoutSession.sessionId || null,
      live: false,
      error: checkoutSession.error || "CHECKOUT_NOT_AVAILABLE",
      accountId: account.id,
      planCode: plan.code,
      amountCents: plan.amountCents,
      currency: "USD",
      squareApplicationId: null,
      squareLocationId: null,
      squareEnvironment: null,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
