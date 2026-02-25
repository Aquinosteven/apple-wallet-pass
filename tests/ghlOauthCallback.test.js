import test from "node:test";
import assert from "node:assert/strict";
import { createGhlOauthCallbackHandler } from "../api/ghl/oauth/callback.js";

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

function createMockRequest(url, query = {}) {
  return {
    method: "GET",
    query,
    url,
    headers: {},
  };
}

function createOauthSupabaseMock() {
  const store = {
    states: new Map([["test-state", { state: "test-state", return_to: "/settings/integrations" }]]),
    installationPayload: null,
  };

  return {
    store,
    from(table) {
      if (table === "ghl_oauth_states") {
        return {
          _state: "",
          delete() {
            return this;
          },
          eq(column, value) {
            if (column === "state") this._state = value;
            return this;
          },
          select() {
            return this;
          },
          async maybeSingle() {
            const found = store.states.get(this._state) || null;
            if (found) store.states.delete(this._state);
            return { data: found, error: null };
          },
        };
      }

      if (table === "ghl_installations") {
        return {
          upsert(payload) {
            store.installationPayload = payload;
            return {
              select() {
                return {
                  async single() {
                    return { data: payload, error: null };
                  },
                };
              },
            };
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };
}

test.beforeEach(() => {
  process.env.GHL_OAUTH_CLIENT_ID = "client-id";
  process.env.GHL_OAUTH_CLIENT_SECRET = "client-secret";
  process.env.GHL_OAUTH_REDIRECT_URI = "https://www.showfi.io/api/ghl/oauth/callback";
});

test("OAuth callback exchanges code, stores tokens, provisions fields, and redirects", async () => {
  const supabase = createOauthSupabaseMock();
  const fetchCalls = [];
  const handler = createGhlOauthCallbackHandler({
    getSupabaseAdmin: () => supabase,
    fetchImpl: async (url, options) => {
      fetchCalls.push({ url, options });
      if (url.endsWith("/oauth/token")) {
        return {
          ok: true,
          status: 200,
          async json() {
            return {
              access_token: "oauth-access-token",
              refresh_token: "oauth-refresh-token",
              expires_in: 3600,
              companyId: "loc_123",
              scope: "contacts.write locations/customFields.write",
            };
          },
        };
      }
      if (url.includes("/customFields") && options?.method === "GET") {
        return {
          ok: true,
          status: 200,
          async json() {
            return { customFields: [] };
          },
        };
      }
      if (url.includes("/customFields") && options?.method === "POST") {
        return {
          ok: true,
          status: 201,
          async json() {
            return {};
          },
        };
      }
      throw new Error(`Unexpected request: ${url}`);
    },
  });

  const req = createMockRequest("/api/ghl/oauth/callback?code=test-code&state=test-state", {
    code: "test-code",
    state: "test-state",
  });
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 302);
  assert.equal(res.headers.Location.startsWith("/settings/integrations?"), true);
  assert.equal(res.headers.Location.includes("ghl_connected=1"), true);
  assert.equal(supabase.store.states.has("test-state"), false);
  assert.equal(supabase.store.installationPayload.location_id, "loc_123");
  assert.equal(typeof supabase.store.installationPayload.access_token, "string");
  assert.equal(
    fetchCalls.filter((call) => call.url.includes("/customFields") && call.options?.method === "POST").length,
    2
  );
});

test("OAuth callback rejects invalid state and never exchanges code", async () => {
  const supabase = createOauthSupabaseMock();
  const handler = createGhlOauthCallbackHandler({
    getSupabaseAdmin: () => supabase,
    fetchImpl: async () => {
      throw new Error("should_not_call_fetch");
    },
  });

  const req = createMockRequest("/api/ghl/oauth/callback?code=test-code&state=bad-state", {
    code: "test-code",
    state: "bad-state",
  });
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body?.ok, false);
  assert.equal(String(res.body?.error || "").includes("state"), true);
});
