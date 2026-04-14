import test from "node:test";
import assert from "node:assert/strict";
import { parseGoogleServiceAccount } from "../lib/googleServiceAccount.js";

const VALID_SERVICE_ACCOUNT = JSON.stringify({
  type: "service_account",
  project_id: "showfi-wallet",
  private_key_id: "abc123",
  private_key: "-----BEGIN PRIVATE KEY-----\nabc\ndef\n-----END PRIVATE KEY-----\n",
  client_email: "wallet-signer@showfi-wallet.iam.gserviceaccount.com",
});

test("parseGoogleServiceAccount parses standard JSON credentials", () => {
  const parsed = parseGoogleServiceAccount(VALID_SERVICE_ACCOUNT);
  assert.equal(parsed.client_email, "wallet-signer@showfi-wallet.iam.gserviceaccount.com");
  assert.match(parsed.private_key, /BEGIN PRIVATE KEY/);
});

test("parseGoogleServiceAccount parses legacy doubly wrapped env export format", () => {
  const legacyExport = JSON.stringify(VALID_SERVICE_ACCOUNT);

  const parsed = parseGoogleServiceAccount(legacyExport);
  assert.equal(parsed.project_id, "showfi-wallet");
  assert.match(parsed.private_key, /abc/);
});

test("parseGoogleServiceAccount parses quoted pseudo-json with escaped whitespace outside strings", () => {
  const malformedEnv = `""{\\n  "type": "service_account",\\n  "project_id": "showfi-wallet",\\n  "private_key": "-----BEGIN PRIVATE KEY-----\\nabc\\ndef\\n-----END PRIVATE KEY-----\\n",\\n  "client_email": "wallet-signer@showfi-wallet.iam.gserviceaccount.com"\\n}""`;

  const parsed = parseGoogleServiceAccount(malformedEnv);
  assert.equal(parsed.type, "service_account");
  assert.equal(parsed.project_id, "showfi-wallet");
});

test("parseGoogleServiceAccount rejects missing credentials", () => {
  assert.throws(
    () => parseGoogleServiceAccount(""),
    /Missing GOOGLE_WALLET_SERVICE_ACCOUNT_JSON/
  );
});
