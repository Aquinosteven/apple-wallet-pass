import test from "node:test";
import assert from "node:assert/strict";
import { createWaitlistHandler, validateWaitlistInput } from "../api/waitlist.js";

function createRequest({ method = "POST", headers = {}, body, rawChunks = [] } = {}) {
  return {
    method,
    headers,
    body,
    socket: { remoteAddress: "127.0.0.1" },
    async *[Symbol.asyncIterator]() {
      for (const chunk of rawChunks) {
        yield Buffer.from(chunk);
      }
    },
  };
}

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    jsonPayload: null,
    ended: false,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.jsonPayload = payload;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
  };
}

test("validateWaitlistInput requires name and valid email", () => {
  const invalid = validateWaitlistInput({ name: "", email: "not-an-email" });
  assert.equal(invalid.ok, false);

  const valid = validateWaitlistInput({ name: "Taylor", email: "Taylor@Example.com" });
  assert.equal(valid.ok, true);
  assert.equal(valid.value.email, "taylor@example.com");
});

test("createWaitlistHandler stores submission and sends inbox email", async () => {
  let insertedPayload = null;
  let mailedPayload = null;
  const handler = createWaitlistHandler({
    getSupabaseAdmin: () => ({
      from(table) {
        assert.equal(table, "waitlist_signups");
        return {
          upsert(payload, options) {
            insertedPayload = { payload, options };
            return {
              select() {
                return {
                  single: async () => ({
                    data: {
                      id: "signup_123",
                      email: payload.email,
                      name: payload.name,
                      company: payload.company,
                      use_case: payload.use_case,
                      notes: payload.notes,
                      source: payload.source,
                      status: payload.status,
                      created_at: "2026-04-10T00:00:00.000Z",
                      updated_at: "2026-04-10T00:00:00.000Z",
                    },
                    error: null,
                  }),
                };
              },
            };
          },
        };
      },
    }),
    sendWaitlistEmail: async (payload) => {
      mailedPayload = payload;
      return { ok: true, provider: "log" };
    },
  });

  const req = createRequest({
    headers: {
      "content-type": "application/json",
      "user-agent": "node-test",
      referer: "https://www.showfi.io/pricing",
      "x-forwarded-for": "203.0.113.10",
    },
    rawChunks: [JSON.stringify({
      name: "Taylor",
      email: "taylor@example.com",
      company: "ShowFi",
      useCase: "Booked calls",
      notes: "Need help when spots reopen.",
      source: "website_waitlist",
      page: "/waitlist",
    })],
  });
  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.jsonPayload?.ok, true);
  assert.equal(insertedPayload.options.onConflict, "email");
  assert.equal(insertedPayload.payload.metadata.page, "/waitlist");
  assert.equal(insertedPayload.payload.metadata.ip, "203.0.113.10");
  assert.equal(mailedPayload.signupId, "signup_123");
  assert.equal(mailedPayload.requesterEmail, "taylor@example.com");
});
