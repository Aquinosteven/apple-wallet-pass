import test from "node:test";
import assert from "node:assert/strict";
import demoAccessHandler from "../api/auth/demo-access.js";
import ghlWebhookHandler from "../api/webhooks/ghl.js";
import { createEmbedSessionHandler } from "../api/embed/session.js";
import { createTokenBucketLimiter } from "../lib/rateLimit.js";
import { validateSharedSecretHeader } from "../lib/sharedSecret.js";

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
    query: options.query || {},
    body: options.body,
    url: options.url || "/api/test",
    socket: { remoteAddress: options.remoteAddress || "203.0.113.10" },
    async *[Symbol.asyncIterator]() {
      if (options.rawBody) yield Buffer.from(options.rawBody);
    },
  };
}

function createEmbedSupabaseMock() {
  const state = {
    inserted: [],
  };

  return {
    state,
    from(table) {
      if (table === "issuance_requests") {
        return {
          select() {
            return this;
          },
          eq(column, value) {
            this[column] = value;
            return this;
          },
          async maybeSingle() {
            if (this.id === "ir_ok" && this.account_id === "acct_ok") {
              return { data: { id: "ir_ok", account_id: "acct_ok" }, error: null };
            }
            return { data: null, error: null };
          },
        };
      }

      if (table === "embed_sessions") {
        return {
          insert(payload) {
            state.inserted.push(payload);
            return {
              select() {
                return {
                  async single() {
                    return {
                      data: {
                        id: "sess_1",
                        expires_at: payload.expires_at,
                        status_page_token: payload.status_page_token,
                      },
                      error: null,
                    };
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

test("validateSharedSecretHeader accepts fallback header names", () => {
  const req = createMockRequest({
    headers: { "x-ghl-secret": "shared-secret" },
  });

  const result = validateSharedSecretHeader(req, "shared-secret", ["x-embed-secret", "x-ghl-secret"]);
  assert.equal(result.ok, true);
});

test("token bucket limiter blocks repeated attempts from same key", () => {
  const limiter = createTokenBucketLimiter({
    scope: "security_endpoint_test",
    capacity: 2,
    windowSeconds: 60,
  });

  assert.equal(limiter("203.0.113.1").allowed, true);
  assert.equal(limiter("203.0.113.1").allowed, true);
  assert.equal(limiter("203.0.113.1").allowed, false);
});

test("demo access endpoint returns 429 after too many requests from same IP", async () => {
  process.env.DEMO_SIGNUP_PASSWORD = "secret";

  const makeReq = () => createMockRequest({
    headers: { "content-type": "application/json" },
    body: { password: "wrong" },
    remoteAddress: "198.51.100.8",
    url: "/api/auth/demo-access",
  });

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const res = createMockResponse();
    await demoAccessHandler(makeReq(), res);
    assert.equal(res.statusCode, 401);
  }

  const blockedRes = createMockResponse();
  await demoAccessHandler(makeReq(), blockedRes);
  assert.equal(blockedRes.statusCode, 429);
});

test("legacy GHL webhook rejects missing shared secret", async () => {
  process.env.GHL_PASS_SECRET = "top-secret";

  const req = createMockRequest({
    headers: { "content-type": "application/json" },
    body: { contactId: "c_1", locationId: "loc_1" },
    url: "/api/webhooks/ghl",
  });
  const res = createMockResponse();

  await ghlWebhookHandler(req, res);

  assert.equal(res.statusCode, 401);
  assert.equal(res.body?.ok, false);
});

test("embed session rejects missing shared secret", async () => {
  process.env.EMBED_SESSION_SECRET = "embed-secret";
  const handler = createEmbedSessionHandler({
    getSupabaseAdmin: createEmbedSupabaseMock,
  });

  const req = createMockRequest({
    headers: { "content-type": "application/json" },
    body: { accountId: "acct_ok", issuanceRequestId: "ir_ok" },
    url: "/api/embed/session",
  });
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 401);
  assert.equal(res.body?.ok, false);
});

test("embed session verifies issuance request ownership before creating session", async () => {
  process.env.EMBED_SESSION_SECRET = "embed-secret";
  const supabase = createEmbedSupabaseMock();
  const handler = createEmbedSessionHandler({
    getSupabaseAdmin: () => supabase,
  });

  const req = createMockRequest({
    headers: {
      "content-type": "application/json",
      "x-embed-secret": "embed-secret",
    },
    body: { accountId: "acct_wrong", issuanceRequestId: "ir_ok" },
    url: "/api/embed/session",
  });
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 404);
  assert.equal(supabase.state.inserted.length, 0);
});
