import { getAuthenticatedUser, setJsonCors } from "../../../lib/apiAuth.js";
import { getGhlIntegrationByUserId, getSupabaseAdmin } from "../../../lib/ghlIntegration.js";

function isMissingRelationError(error) {
  const message = String(error?.message || "").toLowerCase();
  const details = String(error?.details || "").toLowerCase();
  return message.includes("does not exist")
    || message.includes("could not find the table")
    || details.includes("does not exist");
}

export default async function handler(req, res) {
  setJsonCors(res, ["GET", "OPTIONS"]);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth.user) {
      return res.status(auth.status).json({ ok: false, error: auth.error });
    }

    const supabase = getSupabaseAdmin();
    const integration = await getGhlIntegrationByUserId(supabase, auth.user.id);

    const { data: logs, error: logsError } = await supabase
      .from("ghl_webhook_logs")
      .select("id,processing_status,is_test,webhook_received,pass_created,claim_link_created,ghl_writeback_ok,error_message,contact_id,location_id,event_id,tag,claim_url,created_at")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(25);

    if (logsError) {
      if (isMissingRelationError(logsError)) {
        return res.status(200).json({
          ok: true,
          connected: Boolean(integration?.verified_at),
          locationId: integration?.location_id || null,
          apiKeyMasked: integration?.api_key_last4 ? `••••${integration.api_key_last4}` : null,
          defaultEventId: integration?.default_event_id || null,
          lastWebhookAt: integration?.last_webhook_at || null,
          lastError: integration?.last_error || null,
          logs: [],
        });
      }
      return res.status(500).json({ ok: false, error: logsError.message });
    }

    return res.status(200).json({
      ok: true,
      connected: Boolean(integration?.verified_at),
      locationId: integration?.location_id || null,
      apiKeyMasked: integration?.api_key_last4 ? `••••${integration.api_key_last4}` : null,
      defaultEventId: integration?.default_event_id || null,
      lastWebhookAt: integration?.last_webhook_at || null,
      lastError: integration?.last_error || null,
      logs: logs || [],
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
