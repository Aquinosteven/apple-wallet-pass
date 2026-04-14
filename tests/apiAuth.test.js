import test from "node:test";
import assert from "node:assert/strict";
import { rejectDisallowedOrigin, setJsonCors } from "../lib/apiAuth.js";

function createMockResponse() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    getHeader(name) {
      return this.headers[name];
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test("setJsonCors reflects configured allowed origin", () => {
  process.env.CORS_ALLOWED_ORIGINS = "https://app.showfi.io, https://www.showfi.io";
  const req = {
    headers: {
      origin: "https://app.showfi.io",
    },
  };
  const res = createMockResponse();

  const cors = setJsonCors(req, res, ["GET", "OPTIONS"]);

  assert.equal(cors.originAllowed, true);
  assert.equal(res.headers["Access-Control-Allow-Origin"], "https://app.showfi.io");
  assert.equal(res.headers.Vary, "Origin");
});

test("setJsonCors does not reflect untrusted origin and rejectDisallowedOrigin blocks it", () => {
  process.env.CORS_ALLOWED_ORIGINS = "https://www.showfi.io";
  const req = {
    headers: {
      origin: "https://evil.example",
    },
  };
  const res = createMockResponse();

  const cors = setJsonCors(req, res, ["POST", "OPTIONS"], false);
  const rejected = rejectDisallowedOrigin(res, cors);

  assert.equal(cors.originAllowed, false);
  assert.equal(res.headers["Access-Control-Allow-Origin"], undefined);
  assert.equal(rejected, true);
  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.body, { ok: false, error: "Origin not allowed" });
});

test("setJsonCors allows same-origin or non-browser requests without Origin header", () => {
  process.env.CORS_ALLOWED_ORIGINS = "";
  const req = { headers: {} };
  const res = createMockResponse();

  const cors = setJsonCors(req, res, ["GET"]);

  assert.equal(cors.originAllowed, true);
  assert.equal(cors.hasOrigin, false);
  assert.equal(res.headers["Access-Control-Allow-Origin"], undefined);
});
