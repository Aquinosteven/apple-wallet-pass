import test from "node:test";
import assert from "node:assert/strict";
import {
  adaptivePollDelaySeconds,
  createEmbedSessionToken,
  hasBackendTimedOut,
  shouldShowStatusPageLink,
  verifyEmbedSessionToken,
} from "../lib/threadA/embedSession.js";

test("embed session token verifies with correct secret", () => {
  const token = createEmbedSessionToken({
    accountId: "acct_1",
    issuanceRequestId: "iss_1",
    statusPageToken: "status_1",
  }, "embed-secret", 60);

  const verified = verifyEmbedSessionToken(token, "embed-secret");
  assert.equal(verified.ok, true);
  assert.equal(verified.payload.accountId, "acct_1");
});

test("adaptive poll delay follows 1s -> 2s -> 5s progression", () => {
  assert.equal(adaptivePollDelaySeconds(0), 1);
  assert.equal(adaptivePollDelaySeconds(6), 2);
  assert.equal(adaptivePollDelaySeconds(20), 5);
});

test("fallback status page and backend timeout thresholds", () => {
  assert.equal(shouldShowStatusPageLink(19), false);
  assert.equal(shouldShowStatusPageLink(20), true);
  assert.equal(hasBackendTimedOut(119), false);
  assert.equal(hasBackendTimedOut(120), true);
});
