import { createPassWithUniqueToken } from "./claimToken.js";

class IssueClaimError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function normalizeText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeOptionalText(value) {
  const normalized = normalizeText(value);
  return normalized || null;
}

function normalizeSource(metadata, fallback = "issue-claim") {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return fallback;
  }
  const source = typeof metadata.source === "string" ? metadata.source.trim() : "";
  return source || fallback;
}

async function requireEvent(supabase, eventId) {
  const { data, error } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new IssueClaimError(500, error.message || "Failed to query event");
  }
  if (!data) {
    throw new IssueClaimError(404, "Event not found");
  }
  return data;
}

async function upsertRegistrant(supabase, input) {
  const email = normalizeText(input.email).toLowerCase();
  const { data: existing, error: selectError } = await supabase
    .from("registrants")
    .select("id")
    .eq("event_id", input.eventId)
    .eq("email", email)
    .limit(1)
    .maybeSingle();

  if (selectError) {
    throw new IssueClaimError(500, selectError.message || "Failed to query registrant");
  }

  const source = normalizeSource(input.metadata, input.source || "issue-claim");
  const phone = normalizeOptionalText(input.phone);
  const name = normalizeText(input.name);

  if (existing?.id) {
    const updatePayload = { source, phone };
    if (name) updatePayload.name = name;

    const { data: updated, error: updateError } = await supabase
      .from("registrants")
      .update(updatePayload)
      .eq("id", existing.id)
      .select("id")
      .single();

    if (updateError) {
      throw new IssueClaimError(500, updateError.message || "Failed to update registrant");
    }
    return updated;
  }

  const { data: created, error: createError } = await supabase
    .from("registrants")
    .insert({
      event_id: input.eventId,
      email,
      name: name || email,
      phone,
      source,
    })
    .select("id")
    .single();

  if (createError) {
    throw new IssueClaimError(500, createError.message || "Failed to create registrant");
  }
  return created;
}

async function findReusablePass(supabase, eventId, registrantId) {
  const { data, error } = await supabase
    .from("passes")
    .select("id,claim_token,claimed_at")
    .eq("event_id", eventId)
    .eq("registrant_id", registrantId)
    .is("claimed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new IssueClaimError(500, error.message || "Failed to query pass");
  }
  return data || null;
}

export async function issueClaimTokenForRegistrant(supabase, input, deps = {}) {
  const eventId = normalizeText(input?.eventId);
  const email = normalizeText(input?.email).toLowerCase();

  if (!eventId || !email) {
    throw new IssueClaimError(400, "eventId and email are required");
  }

  await requireEvent(supabase, eventId);
  const registrant = await upsertRegistrant(supabase, {
    ...input,
    eventId,
    email,
  });

  let pass = await findReusablePass(supabase, eventId, registrant.id);
  if (!pass?.claim_token) {
    const createPass = deps.createPassWithUniqueToken || createPassWithUniqueToken;
    const created = await createPass(supabase, eventId, registrant.id);
    if (created.error || !created.pass?.claim_token) {
      const message = created.error?.message || created.error || "Failed to create claim token";
      throw new IssueClaimError(500, String(message));
    }
    pass = created.pass;
  }

  return {
    eventId,
    registrantId: registrant.id,
    passId: pass.id,
    claimToken: pass.claim_token,
  };
}

export { IssueClaimError };
