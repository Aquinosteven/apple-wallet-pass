import { readJsonBodyStrict } from "../../../lib/requestValidation.js";
import { getAuthenticatedUser, setJsonCors } from "../../../lib/apiAuth.js";
import {
  getGhlIntegrationByUserId,
  getSupabaseAdmin,
  insertWebhookLog,
  makeIdempotencyKey,
  runGhlIssueFlow,
  updateWebhookLog,
} from "../../../lib/ghlIntegration.js";

function normalizeId(value) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

export default async function handler(req, res) {
  setJsonCors(res, ["POST", "OPTIONS"]);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth.user) {
      return res.status(auth.status).json({ ok: false, error: auth.error });
    }

    const parsed = await readJsonBodyStrict(req, { allowEmpty: true });
    if (!parsed.ok) {
      return res.status(parsed.status).json({ ok: false, error: parsed.error });
    }

    const body = (parsed.body && typeof parsed.body === "object") ? parsed.body : {};
    const contactId = normalizeId(body.contactId);
    const payloadEventId = normalizeId(body.eventId);

    const supabase = getSupabaseAdmin();
    const integration = await getGhlIntegrationByUserId(supabase, auth.user.id);

    if (!integration) {
      return res.status(400).json({ ok: false, error: "Connect a GHL API key first." });
    }

    const locationId = normalizeId(body.locationId) || normalizeId(integration.location_id);
    if (!locationId) {
      return res.status(400).json({ ok: false, error: "Missing locationId. Verify your API key first." });
    }

    const tag = "showfi_self_test";
    const idempotencyKey = `${makeIdempotencyKey({ contactId: contactId || "selftest", eventId: payloadEventId, tag })}:${Date.now()}`;

    const log = await insertWebhookLog(supabase, {
      user_id: auth.user.id,
      integration_id: integration.id,
      source: "ghl_test",
      is_test: true,
      idempotency_key: idempotencyKey,
      request_body: {
        contactId: contactId || null,
        locationId,
        eventId: payloadEventId || null,
        tag,
      },
      event_id: payloadEventId || null,
      tag,
      contact_id: contactId || null,
      location_id: locationId,
      webhook_received: true,
      processing_status: "received",
    });

    try {
      const result = await runGhlIssueFlow({
        supabase,
        req,
        integration,
        contactId,
        locationId,
        tag,
        payloadEventId,
        selfTest: !contactId,
      });

      await updateWebhookLog(supabase, log.id, {
        processing_status: result.writeback.ok || !result.writeback.attempted ? "processed" : "failed",
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
        .from("integrations_ghl")
        .update({
          last_webhook_at: new Date().toISOString(),
          last_error: result.writeback.ok ? null : result.writeback.error,
        })
        .eq("id", integration.id);

      return res.status(200).json({
        ok: true,
        result: {
          webhookReceived: true,
          passCreated: true,
          claimLinkCreated: true,
          ghlWriteback: {
            attempted: result.writeback.attempted,
            ok: result.writeback.ok,
            error: result.writeback.error || null,
          },
          claimUrl: result.walletLinks.claimUrl,
          passId: result.issued.passId,
          claimToken: result.issued.claimToken,
          eventId: result.eventId,
          locationId,
          contactId: contactId || null,
          isSelfTest: !contactId,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await updateWebhookLog(supabase, log.id, {
        processing_status: "failed",
        error_message: message,
      });

      await supabase
        .from("integrations_ghl")
        .update({ last_error: message })
        .eq("id", integration.id);

      return res.status(400).json({
        ok: false,
        result: {
          webhookReceived: true,
          passCreated: false,
          claimLinkCreated: false,
          ghlWriteback: { attempted: false, ok: false, error: message },
        },
        error: message,
      });
    }
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
