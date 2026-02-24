import test from "node:test";
import assert from "node:assert/strict";
import { clearAllLimiters } from "../lib/rateLimit.js";
import { createIssueClaimHandler } from "../api/issue-claim.js";

function createMockResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    ended: false,
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
      this.ended = true;
      return this;
    },
  };
}

function createMockRequest(options = {}) {
  return {
    method: options.method || "POST",
    headers: options.headers || {},
    body: options.body,
    url: options.url || "/api/issue-claim",
    socket: { remoteAddress: options.remoteAddress || "127.0.0.1" },
    async *[Symbol.asyncIterator]() {
      if (options.rawBody) yield Buffer.from(options.rawBody);
    },
  };
}

test.beforeEach(() => {
  clearAllLimiters();
  process.env.GHL_PASS_SECRET = "test-secret";
});

test("issue-claim returns 401 when secret header is missing", async () => {
  const handler = createIssueClaimHandler({
    getSupabaseAdmin: () => {
      throw new Error("should_not_call_db");
    },
  });

  const req = createMockRequest({
    headers: {},
    body: { eventId: "evt_1", email: "test@example.com" },
  });
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 401);
  assert.equal(res.body?.ok, false);
});

test("issue-claim returns 400 for invalid payload", async () => {
  const handler = createIssueClaimHandler({
    getSupabaseAdmin: () => {
      throw new Error("should_not_call_db");
    },
  });

  const req = createMockRequest({
    headers: { "x-ghl-secret": "test-secret" },
    body: { eventId: "evt_1", email: "not-an-email" },
  });
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body?.ok, false);
  assert.equal(Array.isArray(res.body?.fields), true);
});

test("issue-claim returns 200 for happy path", async () => {
  const handler = createIssueClaimHandler({
    getSupabaseAdmin: () => ({ fake: true }),
    requireEvent: async () => ({ event: { id: "event-123" }, error: null, status: 200 }),
    upsertRegistrant: async () => ({ registrant: { id: "reg-123" }, error: null }),
    findReusablePass: async () => ({ pass: null, error: null }),
    createPassWithUniqueToken: async () => ({
      pass: { id: "pass-123", claim_token: "a".repeat(64) },
      error: null,
    }),
  });

  const req = createMockRequest({
    headers: {
      "x-ghl-secret": "test-secret",
      host: "example.com",
      "x-forwarded-proto": "https",
    },
    body: {
      eventId: "event-123",
      name: "Casey",
      email: "casey@example.com",
    },
  });
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.ok, true);
  assert.equal(res.body?.eventId, "event-123");
  assert.equal(res.body?.registrantId, "reg-123");
  assert.equal(res.body?.claimToken, "a".repeat(64));
  assert.equal(
    res.body?.claimUrl,
    `https://example.com/claim/${encodeURIComponent("a".repeat(64))}`
  );
});
