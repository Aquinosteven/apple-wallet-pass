import { getAuthenticatedUser, rejectDisallowedOrigin, setJsonCors } from "../../lib/apiAuth.js";
import { getSupabaseAdmin } from "../../lib/ghlIntegration.js";
import { writeAuditLog } from "../../lib/auditLog.js";
import { readJsonBodyStrict, validateStringField } from "../../lib/requestValidation.js";
import { createCheckoutProvider } from "../../lib/threadA/checkoutProvider.js";
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

function normalizeMetadata(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function sanitizeSurvey(body) {
  const reason = validateStringField(body?.reason, {
    field: "reason",
    required: true,
    min: 2,
    max: 80,
  });
  if (!reason.ok) {
    return { ok: false, status: 400, error: reason.error };
  }

  const detail = validateStringField(body?.detail, {
    field: "detail",
    max: 800,
  });
  if (!detail.ok) {
    return { ok: false, status: 400, error: detail.error };
  }

  const missingFeature = validateStringField(body?.missingFeature, {
    field: "missingFeature",
    max: 200,
  });
  if (!missingFeature.ok) {
    return { ok: false, status: 400, error: missingFeature.error };
  }

  const wouldRecommend = validateStringField(body?.wouldRecommend, {
    field: "wouldRecommend",
    max: 16,
    pattern: /^(yes|no|not_sure)?$/,
  });
  if (!wouldRecommend.ok) {
    return { ok: false, status: 400, error: wouldRecommend.error };
  }

  return {
    ok: true,
    survey: {
      reason: reason.value,
      detail: detail.value || null,
      missing_feature: missingFeature.value || null,
      would_recommend: wouldRecommend.value || null,
    },
  };
}

async function buildBillingPayload(supabase, user) {
  const account = await resolveOrganizationAccess(supabase, user).then((access) => access.activeAccount);
  const subscription = await ensureAccountSubscription(supabase, account.id);
  const gate = computeBillingGateState({ account, subscription });
  const checkoutEnv = getCheckoutEnvContract(process.env);
  const checkoutPaused = isBillingCheckoutDisabled(process.env);

  return {
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
  };
}

export default async function handler(req, res) {
  const cors = setJsonCors(req, res, ["POST", "DELETE", "OPTIONS"]);
  if (req.method === "OPTIONS") return cors.originAllowed
    ? res.status(204).end()
    : res.status(403).json({ ok: false, error: "Origin not allowed" });
  if (rejectDisallowedOrigin(res, cors)) return;
  if (req.method !== "POST" && req.method !== "DELETE") {
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
    const metadata = normalizeMetadata(subscription.metadata);
    const nowIso = new Date().toISOString();
    const checkoutProvider = createCheckoutProvider({ env: process.env });

    if (req.method === "DELETE") {
      if (
        subscription.provider === "square"
        && subscription.provider_subscription_id
        && metadata.square_cancel_action_id
      ) {
        const resumed = await checkoutProvider.resumeSubscription({
          subscriptionId: subscription.provider_subscription_id,
          actionId: metadata.square_cancel_action_id,
        });
        if (!resumed.ok) {
          throw new Error(resumed.error || "Failed to resume Square subscription");
        }
      }

      const nextMetadata = { ...metadata };
      delete nextMetadata.cancel_at_period_end;
      delete nextMetadata.cancel_requested_at;
      delete nextMetadata.cancel_effective_at;
      delete nextMetadata.exit_survey;
      delete nextMetadata.square_cancel_action_id;

      const { error: subscriptionError } = await supabase
        .from("account_subscriptions")
        .update({
          metadata: nextMetadata,
          status: metadata.cancel_at_period_end === true && subscription.status === "canceled"
            ? "active"
            : subscription.status,
          updated_at: nowIso,
        })
        .eq("id", subscription.id);

      if (subscriptionError) {
        throw new Error(subscriptionError.message || "Failed to resume subscription");
      }

      await writeAuditLog(supabase, {
        actorUserId: auth.user.id,
        ownerUserId: auth.user.id,
        action: "account.cancellation.resume",
        targetType: "subscription",
        targetId: subscription.id,
        metadata: {
          accountId: account.id,
        },
      });

      const billing = await buildBillingPayload(supabase, auth.user);
      return res.status(200).json({ ok: true, billing });
    }

    const parsed = await readJsonBodyStrict(req);
    if (!parsed.ok) {
      return res.status(parsed.status).json({ ok: false, error: parsed.error });
    }

    const survey = sanitizeSurvey(parsed.body);
    if (!survey.ok) {
      return res.status(survey.status).json({ ok: false, error: survey.error });
    }

    const currentPeriodEnd = subscription.current_period_end || null;
    const scheduleForPeriodEnd = (
      String(subscription.status || "").toLowerCase() === "active"
      && typeof currentPeriodEnd === "string"
      && new Date(currentPeriodEnd).getTime() > Date.now()
    );

    const nextMetadata = {
      ...metadata,
      cancel_at_period_end: scheduleForPeriodEnd,
      cancel_requested_at: nowIso,
      cancel_effective_at: scheduleForPeriodEnd ? currentPeriodEnd : nowIso,
      exit_survey: {
        ...survey.survey,
        submitted_at: nowIso,
      },
    };

    if (subscription.provider === "square" && subscription.provider_subscription_id) {
      const canceled = await checkoutProvider.cancelSubscription({
        subscriptionId: subscription.provider_subscription_id,
      });
      if (!canceled.ok) {
        throw new Error(canceled.error || "Failed to cancel Square subscription");
      }

      nextMetadata.square_cancel_action_id = canceled.cancelActionId || null;
      if (canceled.paidUntilDate) {
        nextMetadata.paid_until_date = canceled.paidUntilDate;
      }
    }

    const { error: subscriptionError } = await supabase
      .from("account_subscriptions")
      .update({
        status: scheduleForPeriodEnd ? subscription.status : "canceled",
        metadata: nextMetadata,
        updated_at: nowIso,
      })
      .eq("id", subscription.id);

    if (subscriptionError) {
      throw new Error(subscriptionError.message || "Failed to save cancellation request");
    }

    const { error: accountError } = await supabase
      .from("accounts")
      .update({
        billing_state: scheduleForPeriodEnd ? account.billing_state : "canceled",
        updated_at: nowIso,
      })
      .eq("id", account.id);

    if (accountError) {
      throw new Error(accountError.message || "Failed to update account billing state");
    }

    await writeAuditLog(supabase, {
      actorUserId: auth.user.id,
      ownerUserId: auth.user.id,
      action: "account.cancellation.request",
      targetType: "subscription",
      targetId: subscription.id,
      metadata: {
        accountId: account.id,
        effectiveAt: scheduleForPeriodEnd ? currentPeriodEnd : nowIso,
        reason: survey.survey.reason,
      },
    });

    const billing = await buildBillingPayload(supabase, auth.user);
    return res.status(200).json({ ok: true, billing });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
