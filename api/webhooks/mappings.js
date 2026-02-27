import { getAuthenticatedUser, setJsonCors } from "../../lib/apiAuth.js";
import { getSupabaseAdmin } from "../../lib/ghlIntegration.js";
import { buildMappingConfig } from "../../lib/threadA/webhookMapping.js";
import { readJsonBodyStrict } from "../../lib/requestValidation.js";
import { writeAuditLog } from "../../lib/auditLog.js";

async function getOwnedAccount(supabase, ownerUserId) {
  const { data, error } = await supabase
    .from("accounts")
    .select("id,owner_user_id")
    .eq("owner_user_id", ownerUserId)
    .maybeSingle();

  if (error) throw new Error(error.message || "Failed to load account");
  return data || null;
}

async function getEndpointOwnedByAccount(supabase, accountId, endpointId) {
  const { data, error } = await supabase
    .from("webhook_endpoints")
    .select("id,account_id,mapping_version,source_type")
    .eq("id", endpointId)
    .eq("account_id", accountId)
    .maybeSingle();

  if (error) throw new Error(error.message || "Failed to load endpoint");
  return data || null;
}

async function getLatestMapping(supabase, endpointId) {
  const { data, error } = await supabase
    .from("webhook_mappings")
    .select("id,webhook_endpoint_id,preset,field_paths,required_fields,version,created_at")
    .eq("webhook_endpoint_id", endpointId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message || "Failed to load mapping");
  return data || null;
}

export default async function handler(req, res) {
  setJsonCors(res, ["GET", "PUT", "OPTIONS"]);
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth.user) {
      return res.status(auth.status).json({ ok: false, error: auth.error });
    }

    const supabase = getSupabaseAdmin();
    const account = await getOwnedAccount(supabase, auth.user.id);
    if (!account) {
      return res.status(404).json({ ok: false, error: "Account not found for user" });
    }

    const endpointId = typeof req.query?.endpointId === "string" ? req.query.endpointId.trim() : "";
    if (!endpointId) {
      return res.status(400).json({ ok: false, error: "endpointId query param is required" });
    }

    const endpoint = await getEndpointOwnedByAccount(supabase, account.id, endpointId);
    if (!endpoint) {
      return res.status(404).json({ ok: false, error: "Webhook endpoint not found" });
    }

    if (req.method === "GET") {
      const mapping = await getLatestMapping(supabase, endpoint.id);
      const fallback = buildMappingConfig({ preset: endpoint.source_type || "generic" });
      return res.status(200).json({
        ok: true,
        endpointId: endpoint.id,
        mapping: mapping || {
          preset: fallback.preset,
          field_paths: fallback.fields,
          required_fields: ["name", "email", "phone", "joinLink", "tier"],
          version: endpoint.mapping_version || 1,
        },
      });
    }

    if (req.method !== "PUT") {
      return res.status(405).json({ ok: false, error: "Method Not Allowed" });
    }

    const parsed = await readJsonBodyStrict(req);
    if (!parsed.ok) {
      return res.status(parsed.status).json({ ok: false, error: parsed.error });
    }

    const body = parsed.body && typeof parsed.body === "object" ? parsed.body : {};
    const preset = typeof body.preset === "string" ? body.preset.trim().toLowerCase() : "generic";
    const fieldPaths = body.fieldPaths && typeof body.fieldPaths === "object" ? body.fieldPaths : {};
    const normalizedConfig = buildMappingConfig({ preset, fieldPaths });

    const latest = await getLatestMapping(supabase, endpoint.id);
    const nextVersion = Number(latest?.version || endpoint.mapping_version || 1) + 1;

    const { data: created, error: createError } = await supabase
      .from("webhook_mappings")
      .insert({
        webhook_endpoint_id: endpoint.id,
        version: nextVersion,
        preset: normalizedConfig.preset,
        field_paths: normalizedConfig.fields,
        required_fields: ["name", "email", "phone", "joinLink", "tier"],
      })
      .select("id,webhook_endpoint_id,preset,field_paths,required_fields,version,created_at")
      .single();

    if (createError) {
      return res.status(500).json({ ok: false, error: createError.message });
    }

    await supabase
      .from("webhook_endpoints")
      .update({ mapping_version: nextVersion })
      .eq("id", endpoint.id);

    await writeAuditLog(supabase, {
      actorUserId: auth.user.id,
      ownerUserId: auth.user.id,
      action: "webhook.mapping.updated",
      targetType: "webhook_endpoint",
      targetId: endpoint.id,
      metadata: {
        accountId: account.id,
        preset: normalizedConfig.preset,
        mappingVersion: nextVersion,
      },
    });

    return res.status(200).json({
      ok: true,
      endpointId: endpoint.id,
      mapping: created,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
