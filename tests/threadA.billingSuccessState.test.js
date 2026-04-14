import test from "node:test";
import assert from "node:assert/strict";
import { getBillingSuccessViewModel } from "../src/bolt/pages/billing/billingSuccessState.js";

test("billing success shows dashboard CTA when access is confirmed", () => {
  const view = getBillingSuccessViewModel({
    statusResolved: true,
    canAccessDashboard: true,
    requiresSignIn: false,
    plan: "core_monthly_v1",
  });

  assert.equal(view.primaryLabel, "Go to dashboard");
  assert.equal(view.primaryHref, null);
  assert.equal(view.secondaryLabel, "Back to billing");
  assert.equal(view.secondaryHref, "/login?plan=core_monthly_v1");
});

test("billing success shows sign-in CTA when status resolves without a session", () => {
  const view = getBillingSuccessViewModel({
    statusResolved: true,
    canAccessDashboard: false,
    requiresSignIn: true,
    plan: "core_monthly_v1",
  });

  assert.equal(view.primaryLabel, "Sign in to continue");
  assert.equal(view.primaryHref, "/login");
  assert.equal(view.secondaryLabel, "Back to billing");
  assert.equal(view.secondaryHref, "/login?plan=core_monthly_v1");
});

test("billing success shows return-to-billing CTA for unpaid authenticated users", () => {
  const view = getBillingSuccessViewModel({
    statusResolved: true,
    canAccessDashboard: false,
    requiresSignIn: false,
    plan: "core_monthly_v1",
  });

  assert.equal(view.primaryLabel, "Return to billing");
  assert.equal(view.primaryHref, "/login?plan=core_monthly_v1");
  assert.equal(view.secondaryLabel, "Go home");
  assert.equal(view.secondaryHref, "/");
});

test("billing success defaults to safe sign-in CTA before status resolves", () => {
  const view = getBillingSuccessViewModel({
    statusResolved: false,
    canAccessDashboard: false,
    requiresSignIn: false,
    plan: "core_monthly_v1",
  });

  assert.equal(view.primaryLabel, "Sign in to continue");
  assert.equal(view.primaryHref, "/login");
  assert.equal(view.secondaryLabel, "Back to billing");
  assert.equal(view.secondaryHref, "/login?plan=core_monthly_v1");
});
