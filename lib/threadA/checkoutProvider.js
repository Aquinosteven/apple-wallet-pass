import { getEnv, loadLocalEnvFiles } from "../../scripts/env-loader.js";
import { BILLING_PLANS, getSquarePlanVariationEnvName, normalizePlanCode } from "./plans.js";

function normalizeText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function randomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function squareRequest(path, contract, body, method = "POST") {
  const baseUrl = contract.square.environment === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${contract.square.accessToken}`,
      "Content-Type": "application/json",
      "Square-Version": "2025-01-23",
    },
    body: method === "GET" ? undefined : JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: payload?.errors?.[0]?.detail || "SQUARE_API_ERROR",
      payload,
    };
  }

  return { ok: true, payload };
}

function toIsoDateOnly(value = new Date()) {
  return new Date(value).toISOString().slice(0, 10);
}

export function getCheckoutEnvContract(env = process.env) {
  loadLocalEnvFiles();
  const read = (name, fallbackNames = []) => {
    if (env !== process.env) {
      for (const candidate of [name, ...fallbackNames]) {
        const value = normalizeText(env[candidate]);
        if (value) return value;
      }
      return "";
    }
    return getEnv(name, fallbackNames);
  };

  return {
    provider: normalizeText(read("CHECKOUT_PROVIDER", ["BILLING_PROVIDER"]) || "stub").toLowerCase(),
    square: {
      applicationId: read("SQUARE_APPLICATION_ID", ["VITE_SQUARE_APPLICATION_ID"]),
      accessToken: read("SQUARE_ACCESS_TOKEN"),
      locationId: read("SQUARE_LOCATION_ID"),
      environment: normalizeText(read("SQUARE_ENVIRONMENT") || "sandbox").toLowerCase(),
      webhookSignatureKey: read("SQUARE_WEBHOOK_SIGNATURE_KEY"),
      planVariationIds: Object.fromEntries(
        Object.keys(BILLING_PLANS).map((planCode) => [planCode, read(getSquarePlanVariationEnvName(planCode))]),
      ),
    },
  };
}

function createStubProvider() {
  return {
    provider: "stub",
    async createCheckoutSession({ accountId, planCode, successUrl, cancelUrl }) {
      return {
        provider: "stub",
        checkoutMode: "embedded",
        checkoutUrl: null,
        sessionId: `stub_${accountId}_${Date.now()}`,
        planCode,
        successUrl,
        cancelUrl,
        live: false,
      };
    },
    async createPayment({ accountId, planCode }) {
      return {
        provider: "stub",
        subscriptionId: `stub_subscription_${accountId}_${Date.now()}`,
        customerId: `stub_customer_${accountId}`,
        cardId: `stub_card_${accountId}`,
        status: "ACTIVE",
        cancelActionId: null,
        paidUntilDate: null,
        planCode,
        accountId,
        live: false,
      };
    },
    async cancelSubscription({ subscriptionId }) {
      return {
        ok: true,
        subscriptionId: subscriptionId || null,
        status: "CANCELED",
        canceledDate: toIsoDateOnly(),
        paidUntilDate: null,
        cancelActionId: "stub_cancel_action",
      };
    },
    async resumeSubscription({ subscriptionId }) {
      return {
        ok: true,
        subscriptionId: subscriptionId || null,
        status: "ACTIVE",
      };
    },
    async updateSubscriptionCard({ subscriptionId, customerId, sourceId }) {
      return {
        ok: true,
        subscriptionId: subscriptionId || null,
        customerId: customerId || null,
        cardId: sourceId ? `stub_card_${Date.now()}` : null,
        status: "ACTIVE",
        paidUntilDate: null,
      };
    },
    async parseWebhook() {
      return {
        ok: true,
        eventType: "stub.event",
        providerSubscriptionId: null,
        providerCustomerId: null,
        payload: {},
      };
    },
  };
}

function createSquareProvider(contract) {
  const configured = Boolean(
    contract.square.applicationId
    && contract.square.accessToken
    && contract.square.locationId
  );

  return {
    provider: "square",
    async createCheckoutSession({ accountId, planCode, planLabel, amountCents, successUrl, cancelUrl: _cancelUrl }) {
      const normalizedPlanCode = normalizePlanCode(planCode) || planCode;
      if (!configured) {
        return {
          provider: "square",
          checkoutMode: "embedded",
          checkoutUrl: null,
          sessionId: null,
          planCode,
          accountId,
          live: false,
          error: "SQUARE_NOT_CONFIGURED",
        };
      }

      const normalizedAmount = Number(amountCents);
      if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
        return {
          provider: "square",
          checkoutUrl: null,
          sessionId: null,
          planCode,
          accountId,
          live: false,
          error: "INVALID_PLAN_AMOUNT",
        };
      }

      const planVariationId = normalizeText(contract.square.planVariationIds[normalizedPlanCode]);
      if (!planVariationId) {
        return {
          provider: "square",
          checkoutMode: "embedded",
          checkoutUrl: null,
          sessionId: null,
          planCode: normalizedPlanCode,
          accountId,
          live: false,
          error: "SQUARE_PLAN_VARIATION_NOT_CONFIGURED",
        };
      }

      return {
        provider: "square",
        checkoutMode: "embedded",
        checkoutUrl: null,
        sessionId: null,
        planCode: normalizedPlanCode,
        accountId,
        amountCents: Math.round(normalizedAmount),
        currency: "USD",
        squareApplicationId: contract.square.applicationId,
        squareLocationId: contract.square.locationId,
        squareEnvironment: contract.square.environment,
        successUrl: successUrl || null,
        cancelUrl: _cancelUrl || null,
        planLabel: String(planLabel || normalizedPlanCode || "showfi_plan"),
        planVariationId,
        live: true,
      };
    },
    async createPayment({
      accountId,
      planCode,
      sourceId,
      buyerEmailAddress,
      buyerName,
      existingCustomerId,
      verificationToken,
    }) {
      const normalizedPlanCode = normalizePlanCode(planCode) || planCode;
      if (!configured) {
        return {
          provider: "square",
          subscriptionId: null,
          customerId: null,
          cardId: null,
          status: null,
          cancelActionId: null,
          paidUntilDate: null,
          planCode,
          accountId,
          live: false,
          error: "SQUARE_NOT_CONFIGURED",
        };
      }

      const planVariationId = normalizeText(contract.square.planVariationIds[normalizedPlanCode]);
      if (!planVariationId) {
        return {
          provider: "square",
          subscriptionId: null,
          customerId: null,
          cardId: null,
          status: null,
          cancelActionId: null,
          paidUntilDate: null,
          planCode: normalizedPlanCode,
          accountId,
          live: false,
          error: "SQUARE_PLAN_VARIATION_NOT_CONFIGURED",
        };
      }

      const sourceToken = normalizeText(sourceId);
      if (!sourceToken) {
        return {
          provider: "square",
          subscriptionId: null,
          customerId: null,
          cardId: null,
          status: null,
          cancelActionId: null,
          paidUntilDate: null,
          planCode,
          accountId,
          live: false,
          error: "PAYMENT_SOURCE_REQUIRED",
        };
      }

      let customerId = normalizeText(existingCustomerId);
      if (!customerId) {
        const customerResponse = await squareRequest("/v2/customers", contract, {
          idempotency_key: randomId().slice(0, 45),
          email_address: normalizeText(buyerEmailAddress) || undefined,
          reference_id: String(accountId || "unknown_account").slice(0, 40),
          nickname: normalizeText(buyerName) || undefined,
        });
        if (!customerResponse.ok) {
          return {
            provider: "square",
            subscriptionId: null,
            customerId: null,
            cardId: null,
            status: null,
            cancelActionId: null,
            paidUntilDate: null,
            planCode,
            accountId,
            live: false,
            error: customerResponse.error,
          };
        }
        customerId = customerResponse.payload?.customer?.id || "";
      }

      if (!customerId) {
        return {
          provider: "square",
          subscriptionId: null,
          customerId: null,
          cardId: null,
          status: null,
          cancelActionId: null,
          paidUntilDate: null,
          planCode,
          accountId,
          live: false,
          error: "SQUARE_CUSTOMER_NOT_AVAILABLE",
        };
      }

      const cardResponse = await squareRequest("/v2/cards", contract, {
        idempotency_key: randomId().slice(0, 45),
        source_id: sourceToken,
        verification_token: normalizeText(verificationToken) || undefined,
        card: {
          customer_id: customerId,
          cardholder_name: normalizeText(buyerName) || undefined,
          reference_id: String(accountId || "unknown_account").slice(0, 40),
        },
      });

      if (!cardResponse.ok) {
        return {
          provider: "square",
          subscriptionId: null,
          customerId,
          cardId: null,
          status: null,
          cancelActionId: null,
          paidUntilDate: null,
          planCode,
          accountId,
          live: false,
          error: cardResponse.error,
        };
      }

      const cardId = cardResponse.payload?.card?.id || null;
      if (!cardId) {
        return {
          provider: "square",
          subscriptionId: null,
          customerId,
          cardId: null,
          status: null,
          cancelActionId: null,
          paidUntilDate: null,
          planCode,
          accountId,
          live: false,
          error: "SQUARE_CARD_NOT_AVAILABLE",
        };
      }

      const response = await squareRequest("/v2/subscriptions", contract, {
        idempotency_key: randomId().slice(0, 45),
        location_id: contract.square.locationId,
        plan_variation_id: planVariationId,
        customer_id: customerId,
        card_id: cardId,
        start_date: toIsoDateOnly(),
        source: {
          name: "ShowFi",
        },
      });

      if (!response.ok) {
        return {
          provider: "square",
          subscriptionId: null,
          customerId,
          cardId,
          status: null,
          cancelActionId: null,
          paidUntilDate: null,
          planCode,
          accountId,
          live: false,
          error: response.error,
          statusCode: response.status,
        };
      }

      const subscription = response.payload?.subscription || {};
      const action = Array.isArray(response.payload?.actions) ? response.payload.actions[0] || {} : {};
      return {
        provider: "square",
        subscriptionId: subscription.id || null,
        customerId,
        cardId,
        status: subscription.status || null,
        cancelActionId: action.id || null,
        paidUntilDate: subscription.paid_until_date || null,
        chargedThroughDate: subscription.charged_through_date || null,
        canceledDate: subscription.canceled_date || null,
        planCode: normalizedPlanCode,
        accountId,
        live: true,
      };
    },
    async cancelSubscription({ subscriptionId }) {
      const id = normalizeText(subscriptionId);
      if (!id) {
        return { ok: false, error: "SUBSCRIPTION_ID_REQUIRED" };
      }

      const response = await squareRequest(`/v2/subscriptions/${encodeURIComponent(id)}/cancel`, contract, {}, "POST");
      if (!response.ok) {
        return { ok: false, error: response.error };
      }

      const subscription = response.payload?.subscription || {};
      const action = Array.isArray(response.payload?.actions) ? response.payload.actions[0] || {} : {};
      return {
        ok: true,
        subscriptionId: subscription.id || id,
        status: subscription.status || null,
        canceledDate: subscription.canceled_date || null,
        paidUntilDate: subscription.paid_until_date || null,
        cancelActionId: action.id || null,
      };
    },
    async resumeSubscription({ subscriptionId, actionId }) {
      const id = normalizeText(subscriptionId);
      const scheduledActionId = normalizeText(actionId);
      if (!id || !scheduledActionId) {
        return { ok: false, error: "SUBSCRIPTION_ACTION_REQUIRED" };
      }

      const response = await squareRequest(
        `/v2/subscriptions/${encodeURIComponent(id)}/actions/${encodeURIComponent(scheduledActionId)}`,
        contract,
        null,
        "DELETE",
      );
      if (!response.ok) {
        return { ok: false, error: response.error };
      }

      return {
        ok: true,
        subscriptionId: response.payload?.subscription?.id || id,
        status: response.payload?.subscription?.status || null,
      };
    },
    async updateSubscriptionCard({ subscriptionId, customerId, sourceId, verificationToken, buyerName }) {
      const id = normalizeText(subscriptionId);
      const customer = normalizeText(customerId);
      const sourceToken = normalizeText(sourceId);
      if (!id || !customer || !sourceToken) {
        return { ok: false, error: "SUBSCRIPTION_CUSTOMER_AND_SOURCE_REQUIRED" };
      }

      const cardResponse = await squareRequest("/v2/cards", contract, {
        idempotency_key: randomId().slice(0, 45),
        source_id: sourceToken,
        verification_token: normalizeText(verificationToken) || undefined,
        card: {
          customer_id: customer,
          cardholder_name: normalizeText(buyerName) || undefined,
        },
      });

      if (!cardResponse.ok) {
        return { ok: false, error: cardResponse.error };
      }

      const cardId = cardResponse.payload?.card?.id || null;
      if (!cardId) {
        return { ok: false, error: "SQUARE_CARD_NOT_AVAILABLE" };
      }

      const currentSubscription = await squareRequest(`/v2/subscriptions/${encodeURIComponent(id)}`, contract, null, "GET");
      if (!currentSubscription.ok) {
        return { ok: false, error: currentSubscription.error };
      }

      const subscription = currentSubscription.payload?.subscription || {};
      const version = Number(subscription.version);
      if (!Number.isFinite(version)) {
        return { ok: false, error: "SQUARE_SUBSCRIPTION_VERSION_MISSING" };
      }

      const updateResponse = await squareRequest(`/v2/subscriptions/${encodeURIComponent(id)}`, contract, {
        subscription: {
          card_id: cardId,
          version,
        },
      }, "PUT");

      if (!updateResponse.ok) {
        return { ok: false, error: updateResponse.error };
      }

      const updated = updateResponse.payload?.subscription || {};
      return {
        ok: true,
        subscriptionId: updated.id || id,
        customerId: customer,
        cardId,
        status: updated.status || null,
        paidUntilDate: updated.paid_until_date || null,
        chargedThroughDate: updated.charged_through_date || null,
      };
    },
    async parseWebhook(input = {}) {
      if (!configured) {
        return {
          ok: false,
          error: "SQUARE_NOT_CONFIGURED",
        };
      }
      const rawBody = String(input.rawBody || "");
      const parsedPayload = input.payload && typeof input.payload === "object"
        ? input.payload
        : (() => {
          try {
            return JSON.parse(rawBody || "{}");
          } catch {
            return null;
          }
        })();
      if (!parsedPayload) {
        return { ok: false, error: "INVALID_WEBHOOK_BODY" };
      }

      const data = parsedPayload.data?.object || {};
      return {
        ok: true,
        eventType: String(parsedPayload.type || parsedPayload.event_type || "square.event"),
        providerSubscriptionId: data?.subscription?.id || data?.payment?.id || data?.id || null,
        providerCustomerId: data?.subscription?.customer_id || data?.payment?.customer_id || data?.customer_id || null,
        payload: parsedPayload,
      };
    },
  };
}

export function createCheckoutProvider(options = {}) {
  const contract = getCheckoutEnvContract(options.env || process.env);
  const providerName = normalizeText(options.provider || contract.provider || "stub").toLowerCase();

  if (providerName === "square") {
    return createSquareProvider(contract);
  }

  return createStubProvider();
}
