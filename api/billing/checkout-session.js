import { getAuthenticatedUser, setJsonCors } from "../../lib/apiAuth.js";
import { getSupabaseAdmin } from "../../lib/ghlIntegration.js";
import { isValidHttpUrl, readJsonBodyStrict } from "../../lib/requestValidation.js";
import {
  ensureAccountSubscription,
  ensureOwnedAccount,
} from "../../lib/threadA/accountSubscription.js";
import { createCheckoutProvider } from "../../lib/threadA/checkoutProvider.js";
import { getDefaultPlanCode, getPlanByCode } from "../../lib/threadA/plans.js";

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
  setJsonCors(res, ["POST", "OPTIONS"]);
  if (req.method === "OPTIONS") return res.status(204).end();
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
    const planCode = normalizeText(body.planCode) || getDefaultPlanCode();
    const plan = getPlanByCode(planCode);
    if (!plan) {
      return res.status(400).json({ ok: false, error: "Unsupported planCode" });
    }

    const baseUrl = inferBaseUrl(req);
    const successUrl = pickAllowedUrl(body.successUrl, `${baseUrl}/billing/success`);
    const cancelUrl = pickAllowedUrl(body.cancelUrl, `${baseUrl}/billing/cancel`);

    const supabase = getSupabaseAdmin();
    const account = await ensureOwnedAccount(supabase, auth.user);
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
        checkoutUrl: checkoutSession.checkoutUrl,
        sessionId: checkoutSession.sessionId,
        live: checkoutSession.live,
        accountId: account.id,
        planCode: plan.code,
      });
    }

    await supabase
      .from("account_subscriptions")
      .update(updatePayload)
      .eq("id", currentSubscription.id);

    return res.status(409).json({
      ok: false,
      provider: checkoutSession.provider,
      checkoutUrl: null,
      sessionId: checkoutSession.sessionId || null,
      live: false,
      error: checkoutSession.error || "CHECKOUT_NOT_AVAILABLE",
      accountId: account.id,
      planCode: plan.code,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
