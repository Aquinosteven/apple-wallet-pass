import { rejectDisallowedOrigin, setJsonCors } from "../../lib/apiAuth.js";
import { getSupabaseAdmin } from "../../lib/ghlIntegration.js";
import { readJsonBodyStrict } from "../../lib/requestValidation.js";
import { getSupabaseUnavailableMessage, isSupabaseUnavailableError } from "../../lib/supabaseError.js";
import { ensureAccountSubscription, ensureOwnedAccount } from "../../lib/threadA/accountSubscription.js";

function normalizeText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function getDemoSignupPassword() {
  return normalizeText(process.env.DEMO_SIGNUP_PASSWORD);
}

function isAlreadyRegisteredError(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("already been registered")
    || message.includes("user already registered")
    || message.includes("already exists");
}

async function grantFreeAccess(supabase, user) {
  const account = await ensureOwnedAccount(supabase, user);
  const subscription = await ensureAccountSubscription(supabase, account.id);
  const grantedAt = new Date().toISOString();

  const { error: accountError } = await supabase
    .from("accounts")
    .update({ billing_state: "active" })
    .eq("id", account.id);

  if (accountError) {
    throw new Error(accountError.message || "Failed to activate account");
  }

  if (String(subscription?.id || "").startsWith("stub:")) {
    return;
  }

  const currentMetadata = subscription?.metadata && typeof subscription.metadata === "object"
    ? subscription.metadata
    : {};

  const { error: subscriptionError } = await supabase
    .from("account_subscriptions")
    .update({
      provider: "special_link",
      provider_customer_id: `special_link:${account.id}`,
      provider_subscription_id: `special_link:${account.id}`,
      plan_code: "free_access_v1",
      status: "active",
      metadata: {
        ...currentMetadata,
        access_type: "free",
        granted_at: grantedAt,
        signup_source: "special_link_free",
      },
      current_period_start: grantedAt,
      current_period_end: null,
    })
    .eq("account_id", account.id);

  if (subscriptionError) {
    throw new Error(subscriptionError.message || "Failed to activate free subscription");
  }
}

export default async function handler(req, res) {
  const cors = setJsonCors(req, res, ["POST", "OPTIONS"], false);
  if (req.method === "OPTIONS") return cors.originAllowed
    ? res.status(204).end()
    : res.status(403).json({ ok: false, error: "Origin not allowed" });
  if (rejectDisallowedOrigin(res, cors)) return;
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const parsed = await readJsonBodyStrict(req);
    if (!parsed.ok) {
      return res.status(parsed.status).json({ ok: false, error: parsed.error });
    }

    const body = parsed.body && typeof parsed.body === "object" ? parsed.body : {};
    const email = normalizeText(body.email).toLowerCase();
    const password = normalizeText(body.password);
    const isFreeSignup = body.freeSignup === true;
    const demoPassword = normalizeText(body.demoPassword);

    if (!email || !password) {
      return res.status(400).json({ ok: false, error: "Email and password are required." });
    }

    if (password.length < 6) {
      return res.status(400).json({ ok: false, error: "Use a password with at least 6 characters." });
    }

    if (isFreeSignup) {
      const configuredDemoPassword = getDemoSignupPassword();
      if (!configuredDemoPassword) {
        return res.status(503).json({ ok: false, error: "Demo signup is not configured." });
      }

      if (!demoPassword || demoPassword !== configuredDemoPassword) {
        return res.status(401).json({ ok: false, error: "Demo access password is invalid." });
      }
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        signup_source: isFreeSignup ? "special_link_free" : "web",
        access_type: isFreeSignup ? "free" : "trial",
      },
    });

    if (error) {
      if (isSupabaseUnavailableError(error)) {
        return res.status(503).json({ ok: false, error: getSupabaseUnavailableMessage() });
      }

      const status = isAlreadyRegisteredError(error) ? 409 : 400;
      return res.status(status).json({ ok: false, error: error.message || "Failed to create account." });
    }

    if (isFreeSignup && data.user) {
      await grantFreeAccess(supabase, data.user);
    }

    return res.status(200).json({
      ok: true,
      userId: data.user?.id || null,
      email: data.user?.email || email,
      emailConfirmed: true,
      accessType: isFreeSignup ? "free" : "trial",
    });
  } catch (error) {
    if (isSupabaseUnavailableError(error)) {
      return res.status(503).json({
        ok: false,
        error: getSupabaseUnavailableMessage(),
      });
    }

    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
