import test from "node:test";
import assert from "node:assert/strict";
import { createSelftestIssueClaimModeHandler } from "../api/health.js";

function createMockResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    end() {
      return this;
    },
  };
}

function createMockRequest(options = {}) {
  return {
    method: options.method || "GET",
    headers: options.headers || {},
    query: options.query || {},
    url: options.url || "/api/health?mode=selftest-issue-claim",
  };
}

test.beforeEach(() => {
  process.env.SELFTEST_KEY = "selftest-secret";
});

test("selftest-issue-claim returns 401 when key header is missing", async () => {
  const handler = createSelftestIssueClaimModeHandler({
    getSupabaseAdmin: () => {
      throw new Error("should_not_reach_db");
    },
  });

  const req = createMockRequest({ headers: {} });
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 401);
  assert.equal(res.body?.ok, false);
});

test("selftest-issue-claim returns 200 and claimUrl with valid key", async () => {
  const handler = createSelftestIssueClaimModeHandler({
    getSupabaseAdmin: () => ({ fake: true }),
    pickEventId: async () => "event-123",
    issueClaim: async () => ({
      eventId: "event-123",
      registrantId: "reg-123",
      claimToken: "b".repeat(64),
    }),
    buildClaimUrl: () => `https://www.showfi.io/claim/${"b".repeat(64)}`,
  });

  const req = createMockRequest({
    headers: { "x-selftest-key": "selftest-secret" },
  });
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.ok, true);
  assert.equal(res.body?.claimToken, "b".repeat(64));
  assert.equal(res.body?.claimUrl, `https://www.showfi.io/claim/${"b".repeat(64)}`);
});
