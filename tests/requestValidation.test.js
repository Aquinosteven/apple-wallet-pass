import test from "node:test";
import assert from "node:assert/strict";
import { hasJsonContentType, readJsonBodyStrict } from "../lib/requestValidation.js";

function createRequest({ headers = {}, body, rawChunks = [] } = {}) {
  return {
    headers,
    body,
    async *[Symbol.asyncIterator]() {
      for (const chunk of rawChunks) {
        yield Buffer.from(chunk);
      }
    },
  };
}

test("hasJsonContentType detects application/json with charset", () => {
  const req = createRequest({ headers: { "content-type": "application/json; charset=utf-8" } });
  assert.equal(hasJsonContentType(req), true);
});

test("readJsonBodyStrict returns 415 when content-type is not json", async () => {
  const req = createRequest({ headers: { "content-type": "text/plain" } });
  const result = await readJsonBodyStrict(req);
  assert.equal(result.ok, false);
  assert.equal(result.status, 415);
});

test("readJsonBodyStrict parses stream JSON body", async () => {
  const req = createRequest({
    headers: { "content-type": "application/json" },
    rawChunks: ['{"token":"abc"}'],
  });
  const result = await readJsonBodyStrict(req);
  assert.equal(result.ok, true);
  assert.deepEqual(result.body, { token: "abc" });
});

test("readJsonBodyStrict returns 400 for malformed JSON", async () => {
  const req = createRequest({
    headers: { "content-type": "application/json" },
    rawChunks: ['{"token":'],
  });
  const result = await readJsonBodyStrict(req);
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
});

