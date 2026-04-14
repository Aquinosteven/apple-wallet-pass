import test from "node:test";
import assert from "node:assert/strict";
import { getPlanByCode, getSquarePlanVariationEnvName, normalizePlanCode } from "../lib/threadA/plans.js";

test("normalizePlanCode maps legacy solo and free aliases", () => {
  assert.equal(normalizePlanCode("core_monthly_v1"), "solo_monthly_v1");
  assert.equal(normalizePlanCode("core_yearly_v1"), "solo_yearly_v1");
  assert.equal(normalizePlanCode("free_access_v1"), "internal_agency_free_v1");
});

test("getPlanByCode resolves new agency plans", () => {
  assert.equal(getPlanByCode("agency_monthly_v1")?.amountCents, 49700);
  assert.equal(getPlanByCode("agency_yearly_v1")?.amountCents, 499700);
});

test("square plan env names preserve legacy solo env variables", () => {
  assert.equal(getSquarePlanVariationEnvName("solo_monthly_v1"), "SQUARE_PLAN_VARIATION_ID_CORE_MONTHLY_V1");
  assert.equal(getSquarePlanVariationEnvName("solo_yearly_v1"), "SQUARE_PLAN_VARIATION_ID_CORE_YEARLY_V1");
  assert.equal(getSquarePlanVariationEnvName("agency_monthly_v1"), "SQUARE_PLAN_VARIATION_ID_AGENCY_MONTHLY_V1");
});
