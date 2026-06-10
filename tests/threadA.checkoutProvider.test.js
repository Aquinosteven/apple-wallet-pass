import test from "node:test";
import assert from "node:assert/strict";
import { createCheckoutProvider, getCheckoutEnvContract } from "../lib/threadA/checkoutProvider.js";

test("getCheckoutEnvContract reads provider and square env", () => {
  const contract = getCheckoutEnvContract({
    CHECKOUT_PROVIDER: "square",
    SQUARE_APPLICATION_ID: "sq-app",
    SQUARE_ACCESS_TOKEN: "sq-token",
    SQUARE_LOCATION_ID: "loc-123",
    SQUARE_ENVIRONMENT: "sandbox",
    SQUARE_PLAN_VARIATION_ID_CORE_MONTHLY_V1: "planvar-monthly",
  });

  assert.equal(contract.provider, "square");
  assert.equal(contract.square.applicationId, "sq-app");
  assert.equal(contract.square.accessToken, "sq-token");
  assert.equal(contract.square.locationId, "loc-123");
});

test("stub provider returns non-live checkout session", async () => {
  const provider = createCheckoutProvider({ env: { CHECKOUT_PROVIDER: "stub" } });
  const session = await provider.createCheckoutSession({
    accountId: "acct_1",
    planCode: "core_v1",
    successUrl: "https://example.com/success",
    cancelUrl: "https://example.com/cancel",
  });

  assert.equal(provider.provider, "stub");
  assert.equal(session.live, false);
  assert.equal(session.provider, "stub");
  assert.equal(session.checkoutMode, "embedded");
});

function mockSquarePaymentLinkResponse(assertRequest) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assertRequest?.(String(url), options);
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          payment_link: {
            id: "plink_123",
            url: "https://square.link/u/showfi-test",
            order_id: "order_123",
          },
          related_resources: {
            orders: [{ id: "order_123" }],
          },
        };
      },
    };
  };
  return () => {
    globalThis.fetch = originalFetch;
  };
}

test("square provider returns seam-not-configured response without live credentials", async () => {
  const provider = createCheckoutProvider({ env: { CHECKOUT_PROVIDER: "square" } });
  const session = await provider.createCheckoutSession({
    accountId: "acct_1",
    planCode: "core_v1",
  });

  assert.equal(provider.provider, "square");
  assert.equal(session.error, "SQUARE_NOT_CONFIGURED");
  assert.equal(session.live, false);
});

test("square provider returns hosted checkout payment link when square credentials are present", async () => {
  let requestBody = null;
  const restoreFetch = mockSquarePaymentLinkResponse((url, options) => {
    assert.match(url, /\/v2\/online-checkout\/payment-links$/);
    requestBody = JSON.parse(options.body);
  });
  const provider = createCheckoutProvider({
    env: {
      CHECKOUT_PROVIDER: "square",
      SQUARE_APPLICATION_ID: "sq-app",
      SQUARE_ACCESS_TOKEN: "sq-token",
      SQUARE_LOCATION_ID: "loc-123",
      SQUARE_ENVIRONMENT: "sandbox",
      SQUARE_PLAN_VARIATION_ID_CORE_MONTHLY_V1: "planvar-monthly",
    },
  });
  try {
    const session = await provider.createCheckoutSession({
      accountId: "acct_1",
      planCode: "core_monthly_v1",
      planLabel: "Core Monthly",
      amountCents: 9700,
      successUrl: "https://example.com/billing/success",
    });

    assert.equal(session.live, true);
    assert.equal(session.checkoutMode, "redirect");
    assert.equal(session.checkoutUrl, "https://square.link/u/showfi-test");
    assert.equal(session.paymentLinkId, "plink_123");
    assert.equal(session.orderId, "order_123");
    assert.equal(session.squareApplicationId, null);
    assert.equal(session.squareLocationId, null);
    assert.equal(requestBody.quick_pay.price_money.amount, 9700);
    assert.equal(requestBody.checkout_options.redirect_url, "https://example.com/billing/success");
  } finally {
    restoreFetch();
  }
});

test("square provider requires plan variation id for embedded subscription checkout", async () => {
  const provider = createCheckoutProvider({
    env: {
      CHECKOUT_PROVIDER: "square",
      SQUARE_APPLICATION_ID: "sq-app",
      SQUARE_ACCESS_TOKEN: "sq-token",
      SQUARE_LOCATION_ID: "loc-123",
      SQUARE_ENVIRONMENT: "sandbox",
    },
  });
  const payment = await provider.createPayment({
    accountId: "acct_1",
    planCode: "core_monthly_v1",
    sourceId: "cnon:card-nonce-ok",
  });

  assert.equal(payment.live, false);
  assert.equal(payment.error, "SQUARE_PLAN_VARIATION_NOT_CONFIGURED");
});
