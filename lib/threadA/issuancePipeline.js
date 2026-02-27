import crypto from "node:crypto";
import { IssueClaimError, issueClaimTokenForRegistrant } from "../issueClaimCore.js";

function normalizeText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function nowIso() {
  return new Date().toISOString();
}

export function buildIssuanceDedupeKey({ accountId, eventId, crmContactId, email }) {
  const base = [
    normalizeText(accountId),
    normalizeText(eventId),
    normalizeText(crmContactId) || normalizeEmail(email),
  ].join("|");

  return crypto.createHash("sha256").update(base).digest("hex");
}

export function getRetryDelayMs(retryCount) {
  if (retryCount <= 0) return 2000;
  if (retryCount === 1) return 5000;
  return 15000;
}

async function getExistingRequestByDedupeKey(supabase, dedupeKey) {
  const { data, error } = await supabase
    .from("issuance_requests")
    .select("id,status,claim_token,pass_id,retries,max_retries,failure_reason")
    .eq("dedupe_key", dedupeKey)
    .maybeSingle();

  if (error) throw new Error(error.message || "Failed to query issuance request");
  return data || null;
}

async function createIssuanceRequest(supabase, input) {
  const payload = {
    account_id: input.accountId,
    event_id: input.eventId,
    webhook_event_id: input.webhookEventId || null,
    status: "pending",
    crm_contact_id: normalizeText(input.crmContactId) || null,
    email: normalizeEmail(input.email),
    name: normalizeText(input.name) || normalizeEmail(input.email),
    phone: normalizeText(input.phone) || null,
    join_link: normalizeText(input.joinLink),
    tier: normalizeText(input.tier).toUpperCase() === "VIP" ? "VIP" : "GA",
    dedupe_key: input.dedupeKey,
    retries: 0,
    max_retries: Number.isInteger(input.maxRetries) ? input.maxRetries : 3,
  };

  const { data, error } = await supabase
    .from("issuance_requests")
    .insert(payload)
    .select("id,status,retries,max_retries,dedupe_key,event_id,email,name,phone,crm_contact_id,join_link,tier")
    .single();

  if (error) throw new Error(error.message || "Failed to create issuance request");
  return data;
}

async function updateIssuanceRequest(supabase, requestId, patch) {
  const { data, error } = await supabase
    .from("issuance_requests")
    .update({
      ...patch,
      updated_at: nowIso(),
    })
    .eq("id", requestId)
    .select("id,status,retries,max_retries,claim_token,pass_id,failure_reason,next_retry_at")
    .single();

  if (error) throw new Error(error.message || "Failed to update issuance request");
  return data;
}

async function markWebhookStatus(supabase, webhookEventId, patch) {
  if (!webhookEventId) return;
  await supabase
    .from("webhook_events")
    .update({
      ...patch,
      updated_at: nowIso(),
    })
    .eq("id", webhookEventId);
}

async function insertDeadLetter(supabase, input) {
  const { error } = await supabase
    .from("webhook_dead_letter")
    .insert({
      webhook_event_id: input.webhookEventId,
      account_id: input.accountId,
      reason: input.reason,
      retryable: input.retryable === true,
      payload_snapshot: input.payloadSnapshot || {},
    });

  if (error) {
    throw new Error(error.message || "Failed to insert dead-letter record");
  }
}

export async function enqueueIssuanceRequest(supabase, input) {
  if (!normalizeText(input.joinLink)) {
    throw new Error("joinLink is required from source data");
  }

  const dedupeKey = buildIssuanceDedupeKey(input);
  const existing = await getExistingRequestByDedupeKey(supabase, dedupeKey);
  if (existing) {
    return {
      duplicate: true,
      request: existing,
    };
  }

  const request = await createIssuanceRequest(supabase, {
    ...input,
    dedupeKey,
  });

  return {
    duplicate: false,
    request,
  };
}

export async function processIssuanceRequest(supabase, request, deps = {}) {
  const issueClaim = deps.issueClaim || issueClaimTokenForRegistrant;

  try {
    const issued = await issueClaim(supabase, {
      eventId: request.event_id,
      email: request.email,
      name: request.name,
      phone: request.phone,
      metadata: {
        crmContactId: request.crm_contact_id || null,
        joinLink: request.join_link,
        tier: request.tier,
        source: "webhook-instant-issuance",
      },
      source: request.crm_contact_id ? `crm:${request.crm_contact_id}` : "webhook:email",
    });

    const updated = await updateIssuanceRequest(supabase, request.id, {
      status: "completed",
      claim_token: issued.claimToken,
      pass_id: issued.passId,
      failure_reason: null,
      next_retry_at: null,
    });

    await markWebhookStatus(supabase, request.webhook_event_id, {
      processing_status: "processed",
      processed_at: nowIso(),
      failure_reason: null,
    });

    return {
      ok: true,
      request: updated,
      issued,
    };
  } catch (error) {
    const isRetryable = error instanceof IssueClaimError
      ? error.status >= 500
      : true;
    const retries = Number(request.retries || 0);
    const maxRetries = Number(request.max_retries || 3);

    if (isRetryable && retries < maxRetries) {
      const nextRetries = retries + 1;
      const delayMs = getRetryDelayMs(retries);
      const nextRetryAt = new Date(Date.now() + delayMs).toISOString();
      const updated = await updateIssuanceRequest(supabase, request.id, {
        status: "retrying",
        retries: nextRetries,
        next_retry_at: nextRetryAt,
        failure_reason: error instanceof Error ? error.message : String(error),
      });

      await markWebhookStatus(supabase, request.webhook_event_id, {
        processing_status: "retrying",
        attempt_count: nextRetries,
        failure_reason: updated.failure_reason,
      });

      return {
        ok: false,
        retrying: true,
        request: updated,
        error: updated.failure_reason,
      };
    }

    const updated = await updateIssuanceRequest(supabase, request.id, {
      status: "failed",
      failure_reason: error instanceof Error ? error.message : String(error),
      next_retry_at: null,
    });

    if (request.webhook_event_id) {
      await markWebhookStatus(supabase, request.webhook_event_id, {
        processing_status: "failed",
        failure_reason: updated.failure_reason,
      });

      await insertDeadLetter(supabase, {
        webhookEventId: request.webhook_event_id,
        accountId: request.account_id,
        reason: updated.failure_reason || "Unknown failure",
        retryable: false,
        payloadSnapshot: {
          issuanceRequestId: request.id,
          eventId: request.event_id,
          email: request.email,
        },
      });
    }

    return {
      ok: false,
      retrying: false,
      request: updated,
      error: updated.failure_reason,
    };
  }
}
