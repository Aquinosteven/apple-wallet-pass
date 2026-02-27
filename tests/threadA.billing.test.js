import test from "node:test";
import assert from "node:assert/strict";
import { computeBillingAllowance } from "../lib/threadA/billing.js";

test("computeBillingAllowance allows usage under included cap", () => {
  const result = computeBillingAllowance({
    monthlyIncludedIssuances: 20000,
    currentIssuances: 19999,
    requestedUnits: 1,
    enforcementEnabled: true,
    hardBlockIssuance: true,
  });

  assert.equal(result.allowed, true);
  assert.equal(result.overageUnits, 0);
  assert.equal(result.blocked, false);
});

test("computeBillingAllowance blocks when over cap and hard block enabled", () => {
  const result = computeBillingAllowance({
    monthlyIncludedIssuances: 20000,
    currentIssuances: 20000,
    requestedUnits: 1,
    enforcementEnabled: true,
    hardBlockIssuance: true,
  });

  assert.equal(result.allowed, false);
  assert.equal(result.blocked, true);
  assert.equal(result.reason, "BILLING_ENFORCED_OVER_LIMIT");
  assert.equal(result.overageUnits, 1);
});

test("computeBillingAllowance tracks overage but allows when hard block disabled", () => {
  const result = computeBillingAllowance({
    monthlyIncludedIssuances: 20000,
    currentIssuances: 20000,
    requestedUnits: 3,
    enforcementEnabled: true,
    hardBlockIssuance: false,
  });

  assert.equal(result.allowed, true);
  assert.equal(result.inOverage, true);
  assert.equal(result.overageUnits, 3);
});
