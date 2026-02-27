import test from "node:test";
import assert from "node:assert/strict";
import healthHandler from "../api/health.js";
import passHandler from "../api/pass.js";
import googleSaveHandler from "../api/google-save.js";

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
    send(payload) {
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
    method: options.method || "GET",
    headers: options.headers || {},
    query: options.query || {},
    body: options.body,
    url: options.url || "/api/test",
    socket: { remoteAddress: options.remoteAddress || "127.0.0.1" },
    async *[Symbol.asyncIterator]() {
      if (options.rawBody) yield Buffer.from(options.rawBody);
    },
  };
}

test.beforeEach(() => {
  process.env.PROD_DOMAIN = "www.showfi.io";
  delete process.env.ALLOW_NONPROD_WALLET;
});

test("health gwallet on non-prod host returns 200 with non_prod_host", async () => {
  const req = createMockRequest({
    method: "GET",
    headers: { host: "apple-wallet-pass-q1xt.vercel.app" },
    query: { mode: "gwallet" },
    url: "/api/health?mode=gwallet",
  });
  const res = createMockResponse();

  await healthHandler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.ok, false);
  assert.equal(res.body?.error, "non_prod_host");
});

test("pass endpoint on non-prod host returns 403 with non_prod_host", async () => {
  const req = createMockRequest({
    method: "GET",
    headers: { host: "apple-wallet-pass-six-zeta.vercel.app" },
    url: "/api/pass",
  });
  const res = createMockResponse();

  await passHandler(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body?.ok, false);
  assert.equal(res.body?.error, "non_prod_host");
});

test("google-save endpoint on non-prod host returns 403 with non_prod_host", async () => {
  const req = createMockRequest({
    method: "GET",
    headers: { host: "apple-wallet-pass-six-zeta.vercel.app" },
    url: "/api/google-save",
  });
  const res = createMockResponse();

  await googleSaveHandler(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body?.ok, false);
  assert.equal(res.body?.error, "non_prod_host");
});

test("ALLOW_NONPROD_WALLET=true bypasses non_prod_host block", async () => {
  process.env.ALLOW_NONPROD_WALLET = "true";

  const req = createMockRequest({
    method: "GET",
    headers: { host: "apple-wallet-pass-six-zeta.vercel.app" },
    url: "/api/pass",
  });
  const res = createMockResponse();

  await passHandler(req, res);

  assert.notEqual(res.body?.error, "non_prod_host");
});
