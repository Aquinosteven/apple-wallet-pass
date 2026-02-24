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
  delete process.env.GHL_PRIVATE_INTEGRATION_KEY;
  delete process.env.DEBUG_GHL_WEBHOOKS;
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
    issueClaim: async () => ({
      eventId: "event-123",
      registrantId: "reg-123",
      claimToken: "a".repeat(64),
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

test("issue-claim accepts x-www-form-urlencoded payload (GHL style)", async () => {
  const handler = createIssueClaimHandler({
    getSupabaseAdmin: () => ({ fake: true }),
    issueClaim: async () => ({
      eventId: "event-encoded",
      registrantId: "reg-encoded",
      claimToken: "c".repeat(64),
    }),
  });

  const req = createMockRequest({
    headers: {
      "x-ghl-secret": "test-secret",
      host: "example.com",
      "x-forwarded-proto": "https",
      "content-type": "application/x-www-form-urlencoded",
    },
    rawBody: "eventId=event-encoded&email=test%40example.com&name=Test+User&phone=%2B15551234567",
  });
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.ok, true);
  assert.equal(res.body?.eventId, "event-encoded");
  assert.equal(res.body?.claimToken, "c".repeat(64));
  assert.equal(
    res.body?.claimUrl,
    `https://example.com/claim/${encodeURIComponent("c".repeat(64))}`
  );
});

test("issue-claim writes back to LeadConnector contact when IDs and integration key are present", async () => {
  process.env.GHL_PRIVATE_INTEGRATION_KEY = "test-private-key";

  const fetchCalls = [];
  const handler = createIssueClaimHandler({
    getSupabaseAdmin: () => ({ fake: true }),
    issueClaim: async () => ({
      eventId: "event-123",
      registrantId: "reg-123",
      claimToken: "d".repeat(64),
    }),
    fetchImpl: async (url, options) => {
      fetchCalls.push({ url, options });
      return { ok: true, status: 200 };
    },
  });

  const req = createMockRequest({
    headers: {
      "x-ghl-secret": "test-secret",
      host: "example.com",
      "x-forwarded-proto": "https",
    },
    body: {
      eventId: "event-123",
      email: "casey@example.com",
      contactId: "contact_123",
      locationId: 98765,
    },
  });
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.ok, true);
  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].url, "https://services.leadconnectorhq.com/contacts/contact_123");
  assert.equal(fetchCalls[0].options?.method, "PUT");
  assert.equal(fetchCalls[0].options?.headers?.Version, "2021-07-28");
  assert.equal(fetchCalls[0].options?.headers?.Accept, "application/json");
  assert.equal(fetchCalls[0].options?.headers?.["Content-Type"], "application/json");
  assert.equal(typeof fetchCalls[0].options?.headers?.Authorization, "string");
  assert.equal(fetchCalls[0].options?.headers?.Authorization.startsWith("Bearer "), true);

  const requestBody = JSON.parse(fetchCalls[0].options?.body || "{}");
  assert.equal(requestBody.locationId, "98765");
  assert.equal(Array.isArray(requestBody.customFields), true);
  assert.deepEqual(
    requestBody.customFields.map((field) => field.key).sort(),
    ["contact.showfi_claim_token", "contact.showfi_claim_url"]
  );
  const claimUrlField = requestBody.customFields.find((field) => field.key === "contact.showfi_claim_url");
  const claimTokenField = requestBody.customFields.find((field) => field.key === "contact.showfi_claim_token");
  assert.equal(claimUrlField.field_value, `https://example.com/claim/${encodeURIComponent("d".repeat(64))}`);
  assert.equal(claimTokenField.field_value, "d".repeat(64));
});

test("issue-claim skips LeadConnector writeback when contactId or locationId is missing", async () => {
  process.env.GHL_PRIVATE_INTEGRATION_KEY = "test-private-key";

  let fetchCalled = false;
  const handler = createIssueClaimHandler({
    getSupabaseAdmin: () => ({ fake: true }),
    issueClaim: async () => ({
      eventId: "event-123",
      registrantId: "reg-123",
      claimToken: "e".repeat(64),
    }),
    fetchImpl: async () => {
      fetchCalled = true;
      return { ok: true, status: 200 };
    },
  });

  const req = createMockRequest({
    headers: {
      "x-ghl-secret": "test-secret",
      host: "example.com",
      "x-forwarded-proto": "https",
    },
    body: {
      eventId: "event-123",
      email: "casey@example.com",
      contactId: "contact_only",
    },
  });
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.ok, true);
  assert.equal(fetchCalled, false);
});

test("issue-claim swallows LeadConnector writeback non-2xx and returns debug writeback status", async () => {
  process.env.GHL_PRIVATE_INTEGRATION_KEY = "test-private-key";
  process.env.DEBUG_GHL_WEBHOOKS = "true";

  const handler = createIssueClaimHandler({
    getSupabaseAdmin: () => ({ fake: true }),
    issueClaim: async () => ({
      eventId: "event-123",
      registrantId: "reg-123",
      claimToken: "f".repeat(64),
    }),
    fetchImpl: async () => ({ ok: false, status: 422 }),
  });

  const req = createMockRequest({
    headers: {
      "x-ghl-secret": "test-secret",
      host: "example.com",
      "x-forwarded-proto": "https",
    },
    body: {
      eventId: "event-123",
      email: "casey@example.com",
      payload: {
        contact: { id: "contact_nested" },
        location: { id: "location_nested" },
      },
    },
  });
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.ok, true);
  assert.equal(res.body?.ghlWriteback?.attempted, true);
  assert.equal(res.body?.ghlWriteback?.ok, false);
  assert.equal(res.body?.ghlWriteback?.status, 422);
});
