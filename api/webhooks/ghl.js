import { readJsonBodyStrict } from "../../lib/requestValidation.js";
import {
  findWebhookLogByIdempotencyKey,
  getGhlIntegrationByLocationId,
  getSupabaseAdmin,
  insertWebhookLog,
  makeIdempotencyKey,
  runGhlIssueFlow,
  updateWebhookLog,
} from "../../lib/ghlIntegration.js";
import { createTokenBucketLimiter } from "../../lib/rateLimit.js";
import { getClientIp, maybeLogSuspiciousRequest, sendRateLimitExceeded, setNoStore } from "../../lib/security.js";
import { validateSharedSecretHeader } from "../../lib/sharedSecret.js";

const ghlWebhookLimiter = createTokenBucketLimiter({
  scope: "ghl_webhook_ip",
  capacity: 30,
  windowSeconds: 60,
});

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-ghl-secret");
}

function normalizeId(value) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

export default async function handler(req, res) {
  setCors(res);
  setNoStore(res);
  maybeLogSuspiciousRequest(req, { endpoint: "/api/webhooks/ghl" });
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const byIp = ghlWebhookLimiter(getClientIp(req));
    if (!byIp.allowed) {
      return sendRateLimitExceeded(res, byIp.retryAfterSeconds);
    }

    const secret = String(process.env.GHL_PASS_SECRET || "").trim();
    if (!secret) {
      return res.status(500).json({ ok: false, error: "MISSING_GHL_PASS_SECRET" });
    }

    const auth = validateSharedSecretHeader(req, secret, "x-ghl-secret");
    if (!auth.ok) {
      return res.status(auth.status).json({ ok: false, error: auth.error });
    }

    const parsed = await readJsonBodyStrict(req);
    if (!parsed.ok) {
      return res.status(parsed.status).json({ ok: false, error: parsed.error });
    }

    const body = (parsed.body && typeof parsed.body === "object") ? parsed.body : {};
    const contactId = normalizeId(body.contactId);
    const locationId = normalizeId(body.locationId);
    const tag = typeof body.tag === "string" ? body.tag.trim() : "";
    const payloadEventId = normalizeId(body.eventId);
    const eventId = payloadEventId || "";

    if (!contactId || !locationId) {
      return res.status(400).json({ ok: false, error: "contactId and locationId are required" });
    }

    const supabase = getSupabaseAdmin();
    const integration = await getGhlIntegrationByLocationId(supabase, locationId);
    if (!integration) {
      return res.status(404).json({ ok: false, error: "No GHL integration found for locationId" });
    }

    const idempotencyKey = makeIdempotencyKey({ contactId, eventId, tag });
    if (!idempotencyKey) {
      return res.status(400).json({ ok: false, error: "Unable to compute idempotency key" });
    }

    let log;
    try {
      log = await insertWebhookLog(supabase, {
        user_id: integration.user_id || null,
        account_id: integration.account_id || null,
        integration_id: integration.legacy_integration_id || integration.id,
        source: "ghl_tag_added",
        is_test: false,
        idempotency_key: idempotencyKey,
        request_body: body,
        event_id: eventId || null,
        tag: tag || null,
        contact_id: contactId,
        location_id: locationId,
        webhook_received: true,
        processing_status: "received",
      });
    } catch (error) {
      const code = error && typeof error === "object" ? error.code : "";
      if (code === "23505") {
        const existing = await findWebhookLogByIdempotencyKey(supabase, idempotencyKey);
        return res.status(200).json({
          ok: true,
          duplicate: true,
          logId: existing?.id || null,
          processingStatus: existing?.processing_status || "duplicate",
          error: existing?.error_message || null,
        });
      }
      throw error;
    }

    try {
      const result = await runGhlIssueFlow({
        supabase,
        req,
        integration,
        contactId,
        locationId,
        tag,
        payloadEventId: eventId,
      });

      const processingStatus = result.writeback.ok ? "processed" : "failed";
      await updateWebhookLog(supabase, log.id, {
        processing_status: processingStatus,
        pass_created: true,
        claim_link_created: true,
        ghl_writeback_ok: result.writeback.ok,
        pass_id: result.issued.passId,
        claim_token: result.issued.claimToken,
        claim_url: result.walletLinks.claimUrl,
        apple_wallet_url: result.walletLinks.appleWalletUrl,
        google_wallet_url: result.walletLinks.googleWalletUrl,
        error_message: result.writeback.ok ? null : result.writeback.error,
      });

      await supabase
        .from(integration.account_id ? "workspace_integrations_ghl" : "integrations_ghl")
        .update({
          last_webhook_at: new Date().toISOString(),
          last_error: result.writeback.ok ? null : result.writeback.error,
        })
        .eq(integration.account_id ? "account_id" : "id", integration.account_id || integration.id);

      return res.status(200).json({
        ok: true,
        duplicate: false,
        logId: log.id,
        processingStatus,
        claimUrl: result.walletLinks.claimUrl,
        passId: result.issued.passId,
        claimToken: result.issued.claimToken,
        ghlWriteback: result.writeback,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await updateWebhookLog(supabase, log.id, {
        processing_status: "failed",
        error_message: message,
      });

      await supabase
        .from(integration.account_id ? "workspace_integrations_ghl" : "integrations_ghl")
        .update({
          last_error: message,
        })
        .eq(integration.account_id ? "account_id" : "id", integration.account_id || integration.id);

      return res.status(400).json({ ok: false, error: message, logId: log.id });
    }
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
