import { readJsonBodyStrict } from "../../../lib/requestValidation.js";
import { getAuthenticatedUser, rejectDisallowedOrigin, setJsonCors } from "../../../lib/apiAuth.js";
import {
  decryptApiKey,
  getGhlIntegrationByUserId,
  getWorkspaceGhlIntegrationByAccountId,
  getSupabaseAdmin,
  upsertWorkspaceGhlIntegration,
  upsertGhlIntegrationForUser,
  verifyLocationApiKey,
} from "../../../lib/ghlIntegration.js";
import { getRequestedAccountId, resolveOrganizationAccess } from "../../../lib/organizationAccess.js";

export default async function handler(req, res) {
  const cors = setJsonCors(req, res, ["POST", "OPTIONS"]);
  if (req.method === "OPTIONS") return cors.originAllowed
    ? res.status(204).end()
    : res.status(403).json({ ok: false, error: "Origin not allowed" });
  if (rejectDisallowedOrigin(res, cors)) return;
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  let activeAccountId = "";

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
    const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    const verify = body.verify !== false;
    const defaultEventId = typeof body.defaultEventId === "string" ? body.defaultEventId.trim() : null;

    const supabase = getSupabaseAdmin();
    const access = await resolveOrganizationAccess(supabase, auth.user, getRequestedAccountId(req));
    const activeAccount = access.activeAccount;
    activeAccountId = activeAccount?.id || "";
    const existingWorkspaceIntegration = activeAccount
      ? await getWorkspaceGhlIntegrationByAccountId(supabase, activeAccount.id)
      : null;
    const existing = existingWorkspaceIntegration || await getGhlIntegrationByUserId(supabase, auth.user.id);

    if (!apiKey && !existing?.api_key_encrypted) {
      return res.status(400).json({ ok: false, error: "apiKey is required" });
    }

    const persisted = apiKey
      ? (
        activeAccount
          ? await upsertWorkspaceGhlIntegration(supabase, {
              accountId: activeAccount.id,
              apiKey,
              locationId: existing?.location_id || null,
              verifiedAt: null,
              defaultEventId: defaultEventId || existing?.default_event_id || null,
              legacyIntegrationId: existing?.legacy_integration_id || existing?.id || null,
            }) || await upsertGhlIntegrationForUser(supabase, {
              userId: auth.user.id,
              apiKey,
              locationId: existing?.location_id || null,
              verifiedAt: null,
              defaultEventId: defaultEventId || existing?.default_event_id || null,
            })
          : await upsertGhlIntegrationForUser(supabase, {
              userId: auth.user.id,
              apiKey,
              locationId: existing?.location_id || null,
              verifiedAt: null,
              defaultEventId: defaultEventId || existing?.default_event_id || null,
            })
      )
      : existing;

    if (!verify) {
      return res.status(200).json({
        ok: true,
        saved: true,
        connected: Boolean(persisted?.verified_at),
        locationId: persisted?.location_id || null,
        apiKeyMasked: persisted?.api_key_last4 ? `••••${persisted.api_key_last4}` : null,
      });
    }

    const verificationKey = apiKey || decryptApiKey(existing.api_key_encrypted);
    const verification = await verifyLocationApiKey(verificationKey);
    const nowIso = new Date().toISOString();

    let updated = null;
    let updateError = null;

    if (activeAccount) {
      const workspaceUpdate = await supabase
        .from("workspace_integrations_ghl")
        .update({
          location_id: verification.locationId || persisted?.location_id || null,
          verified_at: nowIso,
          last_error: null,
          default_event_id: defaultEventId || persisted?.default_event_id || null,
        })
        .eq("account_id", activeAccount.id)
        .select("id,account_id,location_id,default_event_id,api_key_last4,verified_at,last_webhook_at,last_error")
        .single();
      updated = workspaceUpdate.data;
      updateError = workspaceUpdate.error;
    }

    if (updateError && !String(updateError?.message || "").toLowerCase().includes("does not exist")) {
      return res.status(500).json({ ok: false, error: updateError.message });
    }

    if (!updated) {
      const legacyUpdate = await supabase
        .from("integrations_ghl")
        .update({
          location_id: verification.locationId || persisted?.location_id || null,
          verified_at: nowIso,
          last_error: null,
          default_event_id: defaultEventId || persisted?.default_event_id || null,
        })
        .eq("user_id", auth.user.id)
        .select("id,user_id,location_id,default_event_id,api_key_last4,verified_at,last_webhook_at,last_error")
        .single();
      updated = legacyUpdate.data;
      updateError = legacyUpdate.error;
    }

    if (updateError) {
      return res.status(500).json({ ok: false, error: updateError.message });
    }

    return res.status(200).json({
      ok: true,
      connected: true,
      locationId: updated.location_id,
      verifiedAt: updated.verified_at,
      apiKeyMasked: `••••${updated.api_key_last4}`,
      defaultEventId: updated.default_event_id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = Number.isInteger(error?.status) ? error.status : 400;

    try {
      const auth = await getAuthenticatedUser(req);
      if (auth.user) {
        const supabase = getSupabaseAdmin();
        await supabase
          .from('workspace_integrations_ghl')
          .update({ last_error: message })
          .eq('account_id', activeAccountId);
      }
    } catch {
      // Best-effort error persistence.
    }

    return res.status(status).json({ ok: false, error: message });
  }
}
