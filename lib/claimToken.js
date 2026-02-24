import crypto from "crypto";

export function createClaimToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function createPassWithUniqueToken(supabase, eventId, registrantId, options = {}) {
  const maxAttempts = Number.isInteger(options.maxAttempts) ? options.maxAttempts : 3;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const claimToken = createClaimToken();
    const { data, error } = await supabase
      .from("passes")
      .insert({
        event_id: eventId,
        registrant_id: registrantId,
        claim_token: claimToken,
      })
      .select("id,claim_token")
      .single();

    if (!error) {
      return { pass: data, error: null };
    }

    // Retry token generation on unique-constraint collisions.
    if (error.code === "23505" && String(error.message || "").includes("claim_token")) {
      continue;
    }

    return { pass: null, error };
  }

  return { pass: null, error: { message: "Unable to generate a unique claim token" } };
}
