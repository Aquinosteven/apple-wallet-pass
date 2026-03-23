import { getEnv, loadLocalEnvFiles } from "../../scripts/env-loader.js";

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
      accessToken: read("SQUARE_ACCESS_TOKEN"),
      locationId: read("SQUARE_LOCATION_ID"),
      environment: normalizeText(read("SQUARE_ENVIRONMENT") || "sandbox").toLowerCase(),
      webhookSignatureKey: read("SQUARE_WEBHOOK_SIGNATURE_KEY"),
    },
  };
}

function createStubProvider() {
  return {
    provider: "stub",
    async createCheckoutSession({ accountId, planCode, successUrl, cancelUrl }) {
      return {
        provider: "stub",
        checkoutUrl: null,
        sessionId: `stub_${accountId}_${Date.now()}`,
        planCode,
        successUrl,
        cancelUrl,
        live: false,
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
  const configured = Boolean(contract.square.accessToken && contract.square.locationId);

  return {
    provider: "square",
    async createCheckoutSession({ accountId, planCode, planLabel, amountCents, successUrl, cancelUrl: _cancelUrl }) {
      if (!configured) {
        return {
          provider: "square",
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

      const requestBody = {
        idempotency_key: randomId(),
        quick_pay: {
          name: String(planLabel || planCode || "showfi_plan"),
          price_money: {
            amount: Math.round(normalizedAmount),
            currency: "USD",
          },
          location_id: contract.square.locationId,
        },
        checkout_options: {
          redirect_url: successUrl || "https://example.com/dashboard",
        },
        description: `ShowFi plan ${String(planCode || "showfi_plan")} for ${String(accountId || "unknown_account")}`,
      };

      const response = await squareRequest("/v2/online-checkout/payment-links", contract, requestBody);
      if (!response.ok) {
        return {
          provider: "square",
          checkoutUrl: null,
          sessionId: null,
          planCode,
          accountId,
          live: false,
          error: response.error,
          status: response.status,
        };
      }

      const link = response.payload?.payment_link || {};
      const relatedOrder = Array.isArray(response.payload?.related_resources?.orders)
        ? response.payload.related_resources.orders[0] || {}
        : {};
      let resolvedOrderId = link.order_id || relatedOrder.id || null;

      if (!resolvedOrderId && link.id) {
        const lookup = await squareRequest(`/v2/online-checkout/payment-links/${encodeURIComponent(link.id)}`, contract, null, "GET");
        if (lookup.ok) {
          const lookupLink = lookup.payload?.payment_link || {};
          const lookupOrder = Array.isArray(lookup.payload?.related_resources?.orders)
            ? lookup.payload.related_resources.orders[0] || {}
            : {};
          resolvedOrderId = lookupLink.order_id || lookupOrder.id || null;
        }
      }

      return {
        provider: "square",
        checkoutUrl: link.url || null,
        sessionId: link.id || null,
        paymentLinkId: link.id || null,
        orderId: resolvedOrderId,
        planCode,
        accountId,
        live: Boolean(link.url),
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
