import test from "node:test";
import assert from "node:assert/strict";
import { getTokenFromBody, getTokenFromGetQuery, validateClaimToken } from "../lib/claimValidation.js";

test("getTokenFromGetQuery handles string and trims", () => {
  const token = getTokenFromGetQuery({ query: { token: "  abc123  " } });
  assert.equal(token, "abc123");
});

test("getTokenFromGetQuery handles query array", () => {
  const token = getTokenFromGetQuery({ query: { token: ["  first  ", "second"] } });
  assert.equal(token, "first");
});

test("getTokenFromBody returns empty for invalid body", () => {
  assert.equal(getTokenFromBody(null), "");
  assert.equal(getTokenFromBody({}), "");
});

test("validateClaimToken accepts 64-char hex token", () => {
  const token = "a".repeat(64);
  assert.equal(validateClaimToken(token), null);
});

test("validateClaimToken rejects short, long, and non-hex token", () => {
  assert.equal(validateClaimToken("a".repeat(63)), "token is invalid");
  assert.equal(validateClaimToken("a".repeat(129)), "token is invalid");
  assert.equal(validateClaimToken("z".repeat(64)), "token is invalid");
});

