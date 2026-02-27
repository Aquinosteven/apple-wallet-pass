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

function createSupabaseAdminMock({ installation, upsertInstallation } = {}) {
  const state = {
    installation: installation || null,
    upsertPayload: null,
  };

  function buildInstallationsQuery() {
    return {
      _eq: {},
      select() {
        return this;
      },
      eq(column, value) {
        this._eq[column] = value;
        return this;
      },
      async maybeSingle() {
        if (this._eq.location_id && state.installation && this._eq.location_id === state.installation.location_id) {
          return { data: state.installation, error: null };
        }
        return { data: null, error: null };
      },
      upsert(payload) {
        state.upsertPayload = payload;
        return {
          select() {
            return {
              async single() {
                const mapped = upsertInstallation || payload;
                state.installation = mapped;
                return { data: mapped, error: null };
              },
            };
          },
        };
      },
    };
  }

  return {
    state,
    from(table) {
      if (table === "ghl_installations") return buildInstallationsQuery();
      throw new Error(`Unexpected table: ${table}`);
    },
  };
}

test.beforeEach(() => {
  clearAllLimiters();
  process.env.GHL_PASS_SECRET = "test-secret";
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

test("issue-claim writes back using installation token scoped to location", async () => {
  const fetchCalls = [];
  const supabase = createSupabaseAdminMock({
    installation: {
      id: "inst_1",
      location_id: "98765",
      access_token: "oauth-access-token",
      refresh_token: "oauth-refresh-token",
      token_expires_at: "2099-01-01T00:00:00.000Z",
      scopes: ["contacts.write"],
      installed_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  });
  const handler = createIssueClaimHandler({
    getSupabaseAdmin: () => supabase,
    issueClaim: async () => ({
      eventId: "event-123",
      registrantId: "reg-123",
      claimToken: "d".repeat(64),
    }),
    fetchImpl: async (url, options) => {
      fetchCalls.push({ url, options });
      if (url.includes("/customFields") && options?.method === "GET") {
        return {
          ok: true,
          status: 200,
          async json() {
            return {
              customFields: [
                { fieldKey: "contact.showfi_claim_url" },
                { fieldKey: "contact.showfi_claim_token" },
              ],
            };
          },
        };
      }
      return {
        ok: true,
        status: 200,
        async json() {
          return {};
        },
      };
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
  assert.ok(fetchCalls.length >= 2);

  const getCustomFieldsCall = fetchCalls.find((call) => call.url.includes("/customFields"));
  assert.equal(Boolean(getCustomFieldsCall), true);
  assert.equal(getCustomFieldsCall.options?.method, "GET");
  assert.equal(getCustomFieldsCall.options?.headers?.Version, "2021-07-28");
  assert.equal(getCustomFieldsCall.options?.headers?.Authorization, "Bearer oauth-access-token");

  const updateCall = fetchCalls.find((call) => call.url.includes("/contacts/"));
  assert.equal(updateCall.url, "https://services.leadconnectorhq.com/contacts/contact_123");
  assert.equal(updateCall.options?.method, "PUT");
  assert.equal(updateCall.options?.headers?.Version, "2021-07-28");
  assert.equal(updateCall.options?.headers?.Accept, "application/json");
  assert.equal(updateCall.options?.headers?.["Content-Type"], "application/json");
  assert.equal(updateCall.options?.headers?.Authorization, "Bearer oauth-access-token");

  const requestBody = JSON.parse(updateCall.options?.body || "{}");
  assert.equal(requestBody.locationId, "98765");
  assert.equal(Array.isArray(requestBody.customFields), true);
  const customFieldKeys = requestBody.customFields.map((field) => field.key).sort();
  assert.equal(customFieldKeys.includes("contact.showfi_claim_token"), true);
  assert.equal(customFieldKeys.includes("contact.showfi_claim_url"), true);
  assert.equal(customFieldKeys.includes("contact.showfi_pass_issued_at"), true);
  assert.equal(customFieldKeys.includes("contact.showfi_wallet_added_at"), true);
  assert.equal(customFieldKeys.includes("contact.showfi_join_click_first_at"), true);
  assert.equal(customFieldKeys.includes("contact.showfi_join_click_latest_at"), true);
  assert.equal(customFieldKeys.includes("contact.showfi_join_click_count"), true);
  const claimUrlField = requestBody.customFields.find((field) => field.key === "contact.showfi_claim_url");
  const claimTokenField = requestBody.customFields.find((field) => field.key === "contact.showfi_claim_token");
  assert.equal(claimUrlField.field_value, `https://example.com/claim/${encodeURIComponent("d".repeat(64))}`);
  assert.equal(claimTokenField.field_value, "d".repeat(64));
});

test("issue-claim skips writeback when contactId or locationId is missing", async () => {
  let fetchCalled = false;
  const handler = createIssueClaimHandler({
    getSupabaseAdmin: () => createSupabaseAdminMock(),
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
  process.env.DEBUG_GHL_WEBHOOKS = "true";

  const supabase = createSupabaseAdminMock({
    installation: {
      id: "inst_1",
      location_id: "location_nested",
      access_token: "oauth-access-token",
      refresh_token: "oauth-refresh-token",
      token_expires_at: "2099-01-01T00:00:00.000Z",
      scopes: ["contacts.write"],
      installed_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  });
  const handler = createIssueClaimHandler({
    getSupabaseAdmin: () => supabase,
    issueClaim: async () => ({
      eventId: "event-123",
      registrantId: "reg-123",
      claimToken: "f".repeat(64),
    }),
    fetchImpl: async (url, options) => {
      if (url.includes("/customFields") && options?.method === "GET") {
        return {
          ok: true,
          status: 200,
          async json() {
            return {
              customFields: [
                { fieldKey: "contact.showfi_claim_url" },
                { fieldKey: "contact.showfi_claim_token" },
              ],
            };
          },
        };
      }
      return {
        ok: false,
        status: 422,
        async json() {
          return { message: "unprocessable" };
        },
      };
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

test("issue-claim refreshes expired token before writeback", async () => {
  const fetchCalls = [];
  const supabase = createSupabaseAdminMock({
    installation: {
      id: "inst_1",
      location_id: "location_nested",
      access_token: "expired-token",
      refresh_token: "refresh-token",
      token_expires_at: "2000-01-01T00:00:00.000Z",
      scopes: ["contacts.write"],
      installed_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
    upsertInstallation: {
      id: "inst_1",
      location_id: "location_nested",
      access_token: "fresh-token",
      refresh_token: "fresh-refresh",
      token_expires_at: "2099-01-01T00:00:00.000Z",
      scopes: ["contacts.write"],
      installed_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  });

  process.env.GHL_OAUTH_CLIENT_ID = "client-id";
  process.env.GHL_OAUTH_CLIENT_SECRET = "client-secret";
  process.env.GHL_OAUTH_REDIRECT_URI = "https://www.showfi.io/api/ghl/oauth/callback";

  const handler = createIssueClaimHandler({
    getSupabaseAdmin: () => supabase,
    issueClaim: async () => ({
      eventId: "event-123",
      registrantId: "reg-123",
      claimToken: "f".repeat(64),
    }),
    fetchImpl: async (url, options) => {
      fetchCalls.push({ url, options });
      if (url.endsWith("/oauth/token")) {
        return {
          ok: true,
          status: 200,
          async json() {
            return {
              access_token: "fresh-token",
              refresh_token: "fresh-refresh",
              expires_in: 86400,
              companyId: "location_nested",
              scope: "contacts.write",
            };
          },
        };
      }
      if (url.includes("/customFields") && options?.method === "GET") {
        return {
          ok: true,
          status: 200,
          async json() {
            return {
              customFields: [
                { fieldKey: "contact.showfi_claim_url" },
                { fieldKey: "contact.showfi_claim_token" },
              ],
            };
          },
        };
      }
      return {
        ok: true,
        status: 200,
        async json() {
          return {};
        },
      };
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
  const tokenRefreshCall = fetchCalls.find((call) => call.url.endsWith("/oauth/token"));
  assert.equal(Boolean(tokenRefreshCall), true);
  assert.equal(String(tokenRefreshCall.options?.body || "").includes("grant_type=refresh_token"), true);

  const contactCall = fetchCalls.find((call) => call.url.includes("/contacts/"));
  assert.equal(contactCall.options?.headers?.Authorization, "Bearer fresh-token");
});
