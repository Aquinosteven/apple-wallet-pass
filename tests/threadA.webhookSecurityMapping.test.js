import test from "node:test";
import assert from "node:assert/strict";
import { signWebhookPayload, verifyWebhookSignature } from "../lib/threadA/webhookSecurity.js";
import { buildMappingConfig, normalizeWebhookPayload } from "../lib/threadA/webhookMapping.js";
import { shouldBypassSignatureForLocalTesting } from "../api/webhooks/square.js";

test("verifyWebhookSignature accepts current secret signature", () => {
  const rawBody = JSON.stringify({ hello: "world" });
  const signature = signWebhookPayload(rawBody, "secret-one");

  const result = verifyWebhookSignature({
    signatureHeader: `sha256=${signature}`,
    rawBody,
    currentSecret: "secret-one",
  });

  assert.equal(result.ok, true);
  assert.equal(result.matched, "current");
});

test("verifyWebhookSignature accepts previous secret during overlap window", () => {
  const rawBody = JSON.stringify({ hello: "world" });
  const signature = signWebhookPayload(rawBody, "old-secret");
  const future = new Date(Date.now() + 60_000).toISOString();

  const result = verifyWebhookSignature({
    signatureHeader: signature,
    rawBody,
    currentSecret: "new-secret",
    previousSecret: "old-secret",
    previousSecretExpiresAt: future,
  });

  assert.equal(result.ok, true);
  assert.equal(result.matched, "previous");
});

test("normalizeWebhookPayload maps required fields with GHL preset", () => {
  const mapping = buildMappingConfig({ preset: "ghl" });
  const payload = {
    contact: {
      id: "c_123",
      name: "Casey",
      email: "CASEY@EXAMPLE.COM",
      phone: "+15551234567",
      customData: { joinLink: "https://zoom.us/j/123", tier: "vip" },
    },
  };

  const normalized = normalizeWebhookPayload(payload, mapping);
  assert.equal(normalized.ok, true);
  assert.equal(normalized.normalized.crmContactId, "c_123");
  assert.equal(normalized.normalized.email, "casey@example.com");
  assert.equal(normalized.normalized.tier, "VIP");
});

test("normalizeWebhookPayload enforces dynamic joinLink requirement", () => {
  const mapping = buildMappingConfig({ preset: "generic" });
  const normalized = normalizeWebhookPayload({
    name: "Casey",
    email: "casey@example.com",
    phone: "+1",
    tier: "GA",
  }, mapping);

  assert.equal(normalized.ok, false);
  assert.equal(normalized.errors.includes("joinLink is required from source data"), true);
});

test("square webhook local bypass stays disabled on production-like host", () => {
  const originalBypass = process.env.ALLOW_LOCAL_WEBHOOK_SIGNATURE_BYPASS;
  process.env.ALLOW_LOCAL_WEBHOOK_SIGNATURE_BYPASS = "true";

  try {
    const bypass = shouldBypassSignatureForLocalTesting({
      headers: { host: "showfi.io" },
    });
    assert.equal(bypass, false);
  } finally {
    if (originalBypass === undefined) {
      delete process.env.ALLOW_LOCAL_WEBHOOK_SIGNATURE_BYPASS;
    } else {
      process.env.ALLOW_LOCAL_WEBHOOK_SIGNATURE_BYPASS = originalBypass;
    }
  }
});

test("square webhook local bypass enables on localhost when flag is set", () => {
  const originalBypass = process.env.ALLOW_LOCAL_WEBHOOK_SIGNATURE_BYPASS;
  process.env.ALLOW_LOCAL_WEBHOOK_SIGNATURE_BYPASS = "true";

  try {
    const bypass = shouldBypassSignatureForLocalTesting({
      headers: { host: "127.0.0.1:5173" },
    });
    assert.equal(bypass, true);
  } finally {
    if (originalBypass === undefined) {
      delete process.env.ALLOW_LOCAL_WEBHOOK_SIGNATURE_BYPASS;
    } else {
      process.env.ALLOW_LOCAL_WEBHOOK_SIGNATURE_BYPASS = originalBypass;
    }
  }
});
