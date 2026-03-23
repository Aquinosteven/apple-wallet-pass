import crypto from "node:crypto";
import { setJsonCors } from "../../lib/apiAuth.js";
import { getSupabaseAdmin } from "../../lib/ghlIntegration.js";
import { createCheckoutProvider } from "../../lib/threadA/checkoutProvider.js";

function normalizeText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function inferRequestUrl(req) {
  const forwardedProto = normalizeText(req.headers["x-forwarded-proto"]);
  const forwardedHost = normalizeText(req.headers["x-forwarded-host"]);
  const proto = forwardedProto || "https";
  const host = forwardedHost || normalizeText(req.headers.host) || "localhost";
  return `${proto}://${host}${req.url || "/api/webhooks/square"}`;
}

function isProductionRuntime(req) {
  const host = normalizeText(req.headers["x-forwarded-host"])
    || normalizeText(req.headers.host);
  const prodDomain = normalizeText(process.env.PROD_DOMAIN);
  const vercelEnv = normalizeText(process.env.VERCEL_ENV).toLowerCase();
  const nodeEnv = normalizeText(process.env.NODE_ENV).toLowerCase();

  if (prodDomain && host && host === prodDomain) return true;
  if (vercelEnv === "production") return true;
  if (nodeEnv === "production" && host && !host.includes("localhost")) return true;
  return false;
}

function verifySquareSignature({ signature, body, requestUrl, key }) {
  const normalizedSignature = normalizeText(signature);
  if (!key) {
    return { ok: true, reason: "SIGNATURE_SKIPPED" };
  }
  if (!normalizedSignature) {
    return { ok: false, reason: "MISSING_SIGNATURE" };
  }

  const hmac = crypto.createHmac("sha256", key);
  hmac.update(`${requestUrl}${body}`);
  const digest = hmac.digest("base64");
  const provided = Buffer.from(normalizedSignature);
  const expected = Buffer.from(digest);

  if (provided.length !== expected.length) {
    return { ok: false, reason: "SIGNATURE_LENGTH_MISMATCH" };
  }

  const valid = crypto.timingSafeEqual(provided, expected);
  return { ok: valid, reason: valid ? "SIGNATURE_OK" : "SIGNATURE_MISMATCH" };
}

function parseEventId(payload) {
  if (!payload || typeof payload !== "object") return "";
  return normalizeText(payload.event_id)
    || normalizeText(payload.id)
    || normalizeText(payload.data?.id)
    || "";
}

function parseCheckoutSessionId(payload) {
  if (!payload || typeof payload !== "object") return "";
  return normalizeText(payload.data?.object?.payment_link?.id)
    || normalizeText(payload.data?.object?.id)
    || normalizeText(payload.data?.id)
    || "";
}

function parseOrderId(payload) {
  if (!payload || typeof payload !== "object") return "";
  return normalizeText(payload.data?.object?.payment?.order_id)
    || normalizeText(payload.data?.object?.order?.id)
    || normalizeText(payload.data?.object?.order_id)
    || normalizeText(payload.data?.order_id)
    || "";
}

function parsePaymentStatus(payload) {
  if (!payload || typeof payload !== "object") return "";
  return normalizeText(payload.data?.object?.payment?.status)
    || normalizeText(payload.data?.object?.status)
    || "";
}

function mapEventTypeToStatus(currentStatus, eventType, payload) {
  const normalized = normalizeText(eventType).toLowerCase();
  const paymentStatus = parsePaymentStatus(payload).toLowerCase();
  if (!normalized) return currentStatus || "inactive";

  if (normalized.includes("payment.created") || normalized.includes("payment.updated")) {
    if (paymentStatus === "completed") return "active";
    if (paymentStatus === "failed") return "past_due";
    if (paymentStatus === "canceled") return "canceled";
    return currentStatus || "inactive";
  }

  if (
    normalized.includes("invoice.paid")
    || normalized.includes("subscription.created")
    || normalized.includes("subscription.updated")
    || normalized.includes("subscription.active")
  ) {
    return "active";
  }

  if (normalized.includes("past_due") || normalized.includes("payment.failed")) {
    return "past_due";
  }

  if (normalized.includes("canceled") || normalized.includes("cancelled") || normalized.includes("subscription.deleted")) {
    return "canceled";
  }

  return currentStatus || "inactive";
}

function mapSubscriptionToAccountBillingState(status) {
  const normalized = normalizeText(status).toLowerCase();
  if (normalized === "active") return "active";
  if (normalized === "past_due") return "past_due";
  if (normalized === "canceled") return "canceled";
  return "trial";
}

async function findSubscriptionForEvent(supabase, parsedWebhook) {
  const providerSubscriptionId = normalizeText(parsedWebhook.providerSubscriptionId);
  const providerCustomerId = normalizeText(parsedWebhook.providerCustomerId);
  const payload = parsedWebhook.payload && typeof parsedWebhook.payload === "object"
    ? parsedWebhook.payload
    : {};
  const checkoutSessionId = parseCheckoutSessionId(payload);
  const orderId = parseOrderId(payload);

  if (providerSubscriptionId) {
    const bySubscription = await supabase
      .from("account_subscriptions")
      .select("id,account_id,provider,provider_customer_id,provider_subscription_id,status,metadata,plan_code")
      .eq("provider", "square")
      .eq("provider_subscription_id", providerSubscriptionId)
      .maybeSingle();
    if (!bySubscription.error && bySubscription.data) return bySubscription.data;
  }

  if (checkoutSessionId) {
    const bySession = await supabase
      .from("account_subscriptions")
      .select("id,account_id,provider,provider_customer_id,provider_subscription_id,status,metadata,plan_code")
      .eq("provider", "square")
      .contains("metadata", { pending_checkout_session_id: checkoutSessionId })
      .maybeSingle();

    if (!bySession.error && bySession.data) return bySession.data;
  }

  if (orderId) {
    const byOrder = await supabase
      .from("account_subscriptions")
      .select("id,account_id,provider,provider_customer_id,provider_subscription_id,status,metadata,plan_code")
      .eq("provider", "square")
      .contains("metadata", { pending_checkout_order_id: orderId })
      .maybeSingle();

    if (!byOrder.error && byOrder.data) return byOrder.data;
  }

  if (providerCustomerId) {
    const byCustomer = await supabase
      .from("account_subscriptions")
      .select("id,account_id,provider,provider_customer_id,provider_subscription_id,status,metadata,plan_code")
      .eq("provider", "square")
      .eq("provider_customer_id", providerCustomerId)
      .maybeSingle();
    if (!byCustomer.error && byCustomer.data) return byCustomer.data;
  }

  return null;
}

export default async function handler(req, res) {
  setJsonCors(res, ["POST", "OPTIONS"], false);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    let rawBody = "";
    let parsedBody = {};

    if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
      parsedBody = req.body;
      rawBody = JSON.stringify(req.body);
    } else if (typeof req.body === "string") {
      rawBody = req.body;
      try {
        parsedBody = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        return res.status(400).json({ ok: false, error: "Invalid JSON body" });
      }
    } else if (Buffer.isBuffer(req.body)) {
      rawBody = req.body.toString("utf8");
      try {
        parsedBody = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        return res.status(400).json({ ok: false, error: "Invalid JSON body" });
      }
    } else {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      rawBody = Buffer.concat(chunks).toString("utf8").trim();
      try {
        parsedBody = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        return res.status(400).json({ ok: false, error: "Invalid JSON body" });
      }
    }

    const signature = normalizeText(req.headers["x-square-hmacsha256-signature"]);
    const signatureKey = normalizeText(process.env.SQUARE_WEBHOOK_SIGNATURE_KEY);
    if (!signatureKey && isProductionRuntime(req)) {
      return res.status(500).json({ ok: false, error: "MISSING_WEBHOOK_SIGNATURE_KEY" });
    }
    const verified = verifySquareSignature({
      signature,
      body: rawBody,
      requestUrl: inferRequestUrl(req),
      key: signatureKey,
    });

    if (!verified.ok) {
      return res.status(401).json({ ok: false, error: verified.reason });
    }

    const checkoutProvider = createCheckoutProvider({ env: process.env, provider: "square" });
    const parsedWebhook = await checkoutProvider.parseWebhook({
      payload: parsedBody,
      rawBody,
      headers: req.headers,
    });

    if (!parsedWebhook.ok) {
      return res.status(400).json({ ok: false, error: parsedWebhook.error || "INVALID_WEBHOOK" });
    }

    const supabase = getSupabaseAdmin();
    const subscription = await findSubscriptionForEvent(supabase, parsedWebhook);
    if (!subscription) {
      return res.status(202).json({ ok: true, processed: false, reason: "SUBSCRIPTION_NOT_FOUND" });
    }

    const eventId = parseEventId(parsedWebhook.payload);
    const currentMetadata = subscription.metadata && typeof subscription.metadata === "object"
      ? subscription.metadata
      : {};

    if (eventId && normalizeText(currentMetadata.last_webhook_event_id) === eventId) {
      return res.status(200).json({ ok: true, processed: true, idempotent: true });
    }

    const nextStatus = mapEventTypeToStatus(subscription.status, parsedWebhook.eventType, parsedWebhook.payload);
    const providerCustomerId = normalizeText(parsedWebhook.providerCustomerId) || subscription.provider_customer_id || null;
    const providerSubscriptionId = normalizeText(parsedWebhook.providerSubscriptionId) || subscription.provider_subscription_id || null;

    const nextMetadata = {
      ...currentMetadata,
      last_webhook_event_id: eventId || currentMetadata.last_webhook_event_id || null,
      last_webhook_event_type: parsedWebhook.eventType || null,
      last_webhook_received_at: new Date().toISOString(),
      last_webhook_payload: parsedWebhook.payload || {},
      pending_checkout_session_id: null,
      pending_checkout_payment_link_id: null,
      pending_checkout_order_id: null,
    };

    const { error: subscriptionUpdateError } = await supabase
      .from("account_subscriptions")
      .update({
        provider: "square",
        provider_customer_id: providerCustomerId,
        provider_subscription_id: providerSubscriptionId,
        status: nextStatus,
        metadata: nextMetadata,
      })
      .eq("id", subscription.id);

    if (subscriptionUpdateError) {
      return res.status(500).json({ ok: false, error: subscriptionUpdateError.message });
    }

    await supabase
      .from("accounts")
      .update({ billing_state: mapSubscriptionToAccountBillingState(nextStatus) })
      .eq("id", subscription.account_id);

    return res.status(200).json({
      ok: true,
      processed: true,
      accountId: subscription.account_id,
      subscriptionId: subscription.id,
      status: nextStatus,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
