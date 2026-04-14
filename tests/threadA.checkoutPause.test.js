import test from "node:test";
import assert from "node:assert/strict";
import {
  getBillingCheckoutPauseMessage,
  isBillingCheckoutDisabled,
} from "../lib/threadA/checkoutPause.js";

test("billing checkout defaults to paused", () => {
  assert.equal(isBillingCheckoutDisabled({}), true);
});

test("billing checkout can be explicitly enabled", () => {
  assert.equal(isBillingCheckoutDisabled({ DISABLE_BILLING_CHECKOUT: "false" }), false);
  assert.equal(isBillingCheckoutDisabled({ DISABLE_BILLING_CHECKOUT: " FALSE " }), false);
});

test("billing checkout pause message is stable", () => {
  assert.match(getBillingCheckoutPauseMessage(), /Checkout is temporarily paused/i);
  assert.match(getBillingCheckoutPauseMessage(), /waitlist/i);
});
