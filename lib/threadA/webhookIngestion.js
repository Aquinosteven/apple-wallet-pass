import crypto from "node:crypto";
import { checkIssuanceAllowance, recordSuccessfulIssuance } from "./billing.js";
import { enqueueIssuanceRequest, processIssuanceRequest } from "./issuancePipeline.js";
import { buildMappingConfig, normalizeWebhookPayload } from "./webhookMapping.js";
import { verifyWebhookSignature } from "./webhookSecurity.js";
import { writeAuditLog } from "../auditLog.js";

function normalizeText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function getHeader(req, name) {
  const direct = req?.headers?.[name];
  if (typeof direct === "string") return direct;
  const lowered = req?.headers?.[name.toLowerCase()];
  if (typeof lowered === "string") return lowered;
  return "";
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-showfi-endpoint, x-showfi-signature");
}

function parseJsonSafe(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function readRawBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return {
      raw: JSON.stringify(req.body),
      parsed: req.body,
    };
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return { raw: "", parsed: null };

  return {
    raw,
    parsed: parseJsonSafe(raw),
  };
}

function buildWebhookDedupeKey(input) {
  const joined = [
    input.endpointId,
    input.scope,
    input.eventId || "",
    input.requestId || "",
    input.crmContactId || "",
    input.email || "",
    input.joinLink || "",
  ].join("|");
  return crypto.createHash("sha256").update(joined).digest("hex");
}

async function getWebhookEndpoint(supabase, pathToken, scope) {
  const query = supabase
    .from("webhook_endpoints")
    .select("id,account_id,event_id,source_type,status,path_token,active_secret,previous_secret,previous_secret_expires_at,signature_header,mapping_version")
    .eq("path_token", pathToken)
    .eq("status", "active")
    .limit(1);

  if (scope === "event") {
    query.not("event_id", "is", null);
  } else {
    query.is("event_id", null);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message || "Failed to load webhook endpoint");
  return data || null;
}

async function getMapping(supabase, webhookEndpointId, version) {
  const query = supabase
    .from("webhook_mappings")
    .select("id,preset,field_paths,required_fields,version")
    .eq("webhook_endpoint_id", webhookEndpointId)
    .order("version", { ascending: false })
    .limit(1);

  if (Number.isInteger(version)) {
    query.eq("version", version);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message || "Failed to load webhook mapping");
  return data || null;
}

async function insertWebhookEvent(supabase, payload) {
  const { data, error } = await supabase
    .from("webhook_events")
    .insert(payload)
    .select("id,processing_status,attempt_count")
    .single();

  if (error) {
    const wrapped = new Error(error.message || "Failed to insert webhook event");
    wrapped.code = error.code;
    throw wrapped;
  }

  return data;
}

async function findWebhookEventByDedupeKey(supabase, dedupeKey) {
  const { data, error } = await supabase
    .from("webhook_events")
    .select("id,processing_status,failure_reason")
    .eq("dedupe_key", dedupeKey)
    .maybeSingle();

  if (error) throw new Error(error.message || "Failed to load duplicate webhook event");
  return data || null;
}

async function getAccountOwnerUserId(supabase, accountId) {
  if (!accountId) return null;
  const { data } = await supabase
    .from("accounts")
    .select("owner_user_id")
    .eq("id", accountId)
    .maybeSingle();
  return data?.owner_user_id || null;
}

async function logAudit(supabase, payload) {
  await writeAuditLog(supabase, {
    actorUserId: payload.actor_user_id || null,
    ownerUserId: payload.owner_user_id || null,
    action: payload.action,
    targetType: payload.resource_type || "webhook_event",
    targetId: payload.resource_id || null,
    metadata: payload.metadata || {},
  });
}

export function createWebhookIngestionHandler({ scope, getSupabaseAdmin }) {
  if (scope !== "account" && scope !== "event") {
    throw new Error("scope must be account or event");
  }

  return async function webhookIngestionHandler(req, res) {
    setCors(res);
    if (req.method === "OPTIONS") return res.status(204).end();
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method Not Allowed" });
    }

    try {
      const endpointToken = normalizeText(req.query?.endpoint || getHeader(req, "x-showfi-endpoint"));
      if (!endpointToken) {
        return res.status(400).json({ ok: false, error: "Missing endpoint token" });
      }

      const supabase = getSupabaseAdmin();
      const endpoint = await getWebhookEndpoint(supabase, endpointToken, scope);
      if (!endpoint) {
        return res.status(404).json({ ok: false, error: "Webhook endpoint not found" });
      }

      const { raw, parsed } = await readRawBody(req);
      if (!raw || !parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return res.status(400).json({ ok: false, error: "Invalid JSON payload" });
      }

      const signatureHeaderName = normalizeText(endpoint.signature_header || "x-showfi-signature");
      const signatureVerification = verifyWebhookSignature({
        signatureHeader: getHeader(req, signatureHeaderName),
        rawBody: raw,
        currentSecret: endpoint.active_secret,
        previousSecret: endpoint.previous_secret,
        previousSecretExpiresAt: endpoint.previous_secret_expires_at,
      });

      if (!signatureVerification.ok) {
        return res.status(401).json({
          ok: false,
          error: signatureVerification.error,
        });
      }

      const mappingRow = await getMapping(supabase, endpoint.id, endpoint.mapping_version);
      const mappingConfig = buildMappingConfig({
        preset: mappingRow?.preset || endpoint.source_type || "generic",
        fieldPaths: mappingRow?.field_paths && typeof mappingRow.field_paths === "object" ? mappingRow.field_paths : null,
      });
      const normalizedResult = normalizeWebhookPayload(parsed, mappingConfig);
      if (!normalizedResult.ok) {
        return res.status(400).json({
          ok: false,
          error: "Unable to normalize required fields",
          details: normalizedResult.errors,
        });
      }

      const normalized = normalizedResult.normalized;
      const targetEventId = scope === "event"
        ? endpoint.event_id
        : normalizeText(req.query?.eventId || normalized.eventId || parsed.eventId);
      if (!targetEventId) {
        return res.status(400).json({ ok: false, error: "eventId is required" });
      }

      const requestId = normalizeText(getHeader(req, "x-request-id") || parsed.requestId || parsed.id);
      const dedupeKey = buildWebhookDedupeKey({
        endpointId: endpoint.id,
        scope,
        eventId: targetEventId,
        requestId,
        crmContactId: normalized.crmContactId,
        email: normalized.email,
        joinLink: normalized.joinLink,
      });

      let webhookEvent;
      try {
        webhookEvent = await insertWebhookEvent(supabase, {
          account_id: endpoint.account_id,
          event_id: targetEventId,
          webhook_endpoint_id: endpoint.id,
          delivery_scope: scope,
          source_type: endpoint.source_type,
          event_type: normalizeText(parsed.eventType || parsed.type),
          request_id: requestId || null,
          request_signature: getHeader(req, signatureHeaderName) || null,
          dedupe_key: dedupeKey,
          raw_payload: parsed,
          normalized_payload: normalized,
          processing_status: "received",
          attempt_count: 0,
        });
      } catch (error) {
        if (error.code === "23505") {
          const duplicate = await findWebhookEventByDedupeKey(supabase, dedupeKey);
          return res.status(200).json({
            ok: true,
            duplicate: true,
            webhookEventId: duplicate?.id || null,
            processingStatus: duplicate?.processing_status || "duplicate",
          });
        }
        throw error;
      }

      const enqueued = await enqueueIssuanceRequest(supabase, {
        accountId: endpoint.account_id,
        eventId: targetEventId,
        webhookEventId: webhookEvent.id,
        crmContactId: normalized.crmContactId,
        email: normalized.email,
        name: normalized.name,
        phone: normalized.phone,
        joinLink: normalized.joinLink,
        tier: normalized.tier,
      });

      if (enqueued.duplicate) {
        return res.status(200).json({
          ok: true,
          duplicate: true,
          webhookEventId: webhookEvent.id,
          issuanceRequestId: enqueued.request?.id || null,
          processingStatus: enqueued.request?.status || "completed",
          claimToken: enqueued.request?.claim_token || null,
          passId: enqueued.request?.pass_id || null,
        });
      }

      const usageDecision = await checkIssuanceAllowance(supabase, {
        accountId: endpoint.account_id,
        requestedUnits: 1,
      });

      if (!usageDecision.allowed) {
        await supabase
          .from("webhook_events")
          .update({
            processing_status: "failed",
            failure_reason: usageDecision.reason,
          })
          .eq("id", webhookEvent.id);
        await supabase
          .from("issuance_requests")
          .update({
            status: "failed",
            failure_reason: usageDecision.reason,
            updated_at: new Date().toISOString(),
          })
          .eq("id", enqueued.request.id);

        const ownerUserId = await getAccountOwnerUserId(supabase, endpoint.account_id);
        await logAudit(supabase, {
          account_id: endpoint.account_id,
          actor_user_id: null,
          owner_user_id: ownerUserId,
          action: "issuance.blocked.billing",
          resource_type: "webhook_event",
          resource_id: webhookEvent.id,
          metadata: {
            reason: usageDecision.reason,
            projectedUsage: usageDecision.projectedUsage,
            included: usageDecision.included,
          },
        });

        return res.status(402).json({
          ok: false,
          error: usageDecision.reason,
          webhookEventId: webhookEvent.id,
          issuanceRequestId: enqueued.request.id,
          billing: usageDecision,
        });
      }

      const requestToProcess = enqueued.request;
      const result = await processIssuanceRequest(supabase, {
        id: requestToProcess.id,
        account_id: endpoint.account_id,
        event_id: targetEventId,
        webhook_event_id: webhookEvent.id,
        email: normalized.email,
        name: normalized.name,
        phone: normalized.phone,
        crm_contact_id: normalized.crmContactId,
        join_link: normalized.joinLink,
        tier: normalized.tier,
        retries: Number(requestToProcess.retries || 0),
        max_retries: Number(requestToProcess.max_retries || 3),
      });

      if (result.ok) {
        await recordSuccessfulIssuance(supabase, {
          accountId: endpoint.account_id,
          requestedUnits: 1,
        });
      }

      const ownerUserId = await getAccountOwnerUserId(supabase, endpoint.account_id);
      await logAudit(supabase, {
        account_id: endpoint.account_id,
        actor_user_id: null,
        owner_user_id: ownerUserId,
        action: "webhook.ingested",
        resource_type: "webhook_event",
        resource_id: webhookEvent.id,
        metadata: {
          scope,
          sourceType: endpoint.source_type,
          signatureMatched: signatureVerification.matched,
          issuanceResult: result.ok ? "completed" : (result.retrying ? "retrying" : "failed"),
        },
      });

      const status = result.ok ? 201 : (result.retrying ? 202 : 500);
      return res.status(status).json({
        ok: result.ok,
        duplicate: false,
        webhookEventId: webhookEvent.id,
        issuanceRequestId: requestToProcess.id,
        processingStatus: result.request?.status || "unknown",
        claimToken: result.issued?.claimToken || null,
        passId: result.issued?.passId || null,
        error: result.error || null,
      });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };
}
