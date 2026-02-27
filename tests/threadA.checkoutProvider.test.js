import test from "node:test";
import assert from "node:assert/strict";
import { createCheckoutProvider, getCheckoutEnvContract } from "../lib/threadA/checkoutProvider.js";

test("getCheckoutEnvContract reads provider and square env", () => {
  const contract = getCheckoutEnvContract({
    CHECKOUT_PROVIDER: "square",
    SQUARE_ACCESS_TOKEN: "sq-token",
    SQUARE_LOCATION_ID: "loc-123",
    SQUARE_ENVIRONMENT: "sandbox",
  });

  assert.equal(contract.provider, "square");
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
});

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
