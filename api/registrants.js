import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedUser, rejectDisallowedOrigin, setJsonCors } from "../lib/apiAuth.js";
import { readJsonBodyStrict } from "../lib/requestValidation.js";
import { createPassWithUniqueToken } from "../lib/claimToken.js";
import { getEnv, loadLocalEnvFiles } from "../scripts/env-loader.js";
import { getRequestedAccountId, resolveOrganizationAccess } from "../lib/organizationAccess.js";

function getSupabaseAdmin() {
  loadLocalEnvFiles();
  const supabaseUrl = getEnv("SUPABASE_URL", ["VITE_SUPABASE_URL"]);
  const supabaseServiceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}


function normalizeOptionalField(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function mapPassStatusToTicketStatus(pass) {
  const normalizedStatus = String(pass?.status || "").toLowerCase();
  if (normalizedStatus === "checked_in") return "checked_in";
  if (normalizedStatus === "expired") return "expired";
  if (pass?.claimed_at) return "added";
  return "issued";
}

export function formatIssuedAtLabel(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(parsed);
}

export function buildRegistrantResponse(registrant, pass, eventNameById = new Map()) {
  return {
    id: registrant.id,
    eventId: registrant.event_id,
    eventName: eventNameById.get(registrant.event_id) || "",
    attendeeName: registrant.name,
    email: registrant.email,
    phone: registrant.phone,
    source: registrant.source,
    issuedAt: registrant.created_at,
    issuedAtLabel: formatIssuedAtLabel(registrant.created_at),
    status: mapPassStatusToTicketStatus(pass),
    passId: pass?.id || null,
    claimToken: pass?.claim_token || null,
    claimedAt: pass?.claimed_at || null,
    passStatus: pass?.status || null,
  };
}

export default async function handler(req, res) {
  const cors = setJsonCors(req, res, ["GET", "POST", "PATCH", "OPTIONS"]);

  if (req.method === "OPTIONS") {
    return cors.originAllowed
      ? res.status(204).end()
      : res.status(403).json({ ok: false, error: "Origin not allowed" });
  }
  if (rejectDisallowedOrigin(res, cors)) return;

  if (!["GET", "POST", "PATCH"].includes(req.method || "")) {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const authResult = await getAuthenticatedUser(req);
    if (!authResult.user) {
      return res.status(authResult.status).json({ ok: false, error: authResult.error });
    }

    const supabase = getSupabaseAdmin();
    const access = await resolveOrganizationAccess(supabase, authResult.user, getRequestedAccountId(req));
    const accountId = access.activeAccount?.id || null;

    if (req.method === "GET") {
      const requestedEventId = typeof req.query?.eventId === "string" ? req.query.eventId.trim() : "";
      let eventsQuery = supabase
        .from("events")
        .select("id,name")
        .eq(accountId ? "account_id" : "user_id", accountId || authResult.user.id)
        .order("created_at", { ascending: false });

      if (requestedEventId) {
        eventsQuery = eventsQuery.eq("id", requestedEventId).limit(1);
      }

      const { data: ownedEvents, error: ownedEventsError } = await eventsQuery;
      if (ownedEventsError) {
        return res.status(500).json({ ok: false, error: ownedEventsError.message });
      }

      const eventIds = (ownedEvents || []).map((event) => event.id);
      if (requestedEventId && !eventIds.length) {
        return res.status(404).json({ ok: false, error: "Event not found" });
      }
      if (!eventIds.length) {
        return res.status(200).json({ ok: true, registrants: [] });
      }

      const eventNameById = new Map((ownedEvents || []).map((event) => [event.id, event.name]));
      const { data: registrants, error: registrantsError } = await supabase
        .from("registrants")
        .select("id,event_id,name,email,phone,source,created_at")
        .in("event_id", eventIds)
        .order("created_at", { ascending: false });

      if (registrantsError) {
        return res.status(500).json({ ok: false, error: registrantsError.message });
      }

      const registrantIds = (registrants || []).map((row) => row.id);
      let passByRegistrantId = new Map();
      if (registrantIds.length) {
        const { data: passes, error: passesError } = await supabase
          .from("passes")
          .select("id,event_id,registrant_id,claim_token,claimed_at,status,created_at")
          .in("registrant_id", registrantIds)
          .order("created_at", { ascending: false });

        if (passesError) {
          return res.status(500).json({ ok: false, error: passesError.message });
        }

        passByRegistrantId = new Map();
        for (const pass of passes || []) {
          if (!passByRegistrantId.has(pass.registrant_id)) {
            passByRegistrantId.set(pass.registrant_id, pass);
          }
        }
      }

      const payload = (registrants || []).map((registrant) =>
        buildRegistrantResponse(registrant, passByRegistrantId.get(registrant.id), eventNameById)
      );

      return res.status(200).json({ ok: true, registrants: payload });
    }

    const parsedBody = await readJsonBodyStrict(req);
    if (!parsedBody.ok) {
      return res.status(parsedBody.status).json({ ok: false, error: parsedBody.error });
    }
    const body = parsedBody.body;
    if (!body || typeof body !== "object") {
      return res.status(400).json({ ok: false, error: "Invalid JSON body" });
    }

    if (req.method === "PATCH") {
      const passId = typeof body.passId === "string" ? body.passId.trim() : "";
      const action = typeof body.action === "string" ? body.action.trim().toLowerCase() : "";

      if (!passId) {
        return res.status(400).json({ ok: false, error: "passId is required" });
      }
      if (action !== "check_in") {
        return res.status(400).json({ ok: false, error: "Unsupported registrant action" });
      }

      const { data: passRow, error: passLoadError } = await supabase
        .from("passes")
        .select("id,event_id,registrant_id,claim_token,claimed_at,status,created_at")
        .eq("id", passId)
        .maybeSingle();

      if (passLoadError) {
        return res.status(500).json({ ok: false, error: passLoadError.message });
      }
      if (!passRow) {
        return res.status(404).json({ ok: false, error: "Pass not found" });
      }

      const { data: ownedEvent, error: ownedEventError } = await supabase
        .from("events")
        .select("id,name")
        .eq("id", passRow.event_id)
        .eq(accountId ? "account_id" : "user_id", accountId || authResult.user.id)
        .maybeSingle();

      if (ownedEventError) {
        return res.status(500).json({ ok: false, error: ownedEventError.message });
      }
      if (!ownedEvent) {
        return res.status(404).json({ ok: false, error: "Pass not found" });
      }

      if (String(passRow.status || "").toLowerCase() === "expired") {
        return res.status(400).json({ ok: false, error: "Expired passes cannot be checked in" });
      }

      const targetStatus = "checked_in";
      let updatedPass = passRow;
      if (String(passRow.status || "").toLowerCase() !== targetStatus) {
        const { data: savedPass, error: passUpdateError } = await supabase
          .from("passes")
          .update({
            status: targetStatus,
            last_updated_at: new Date().toISOString(),
          })
          .eq("id", passId)
          .select("id,event_id,registrant_id,claim_token,claimed_at,status,created_at")
          .single();

        if (passUpdateError) {
          return res.status(500).json({ ok: false, error: passUpdateError.message });
        }

        updatedPass = savedPass;
      }

      const { data: registrantRow, error: registrantLoadError } = await supabase
        .from("registrants")
        .select("id,event_id,name,email,phone,source,created_at")
        .eq("id", updatedPass.registrant_id)
        .maybeSingle();

      if (registrantLoadError) {
        return res.status(500).json({ ok: false, error: registrantLoadError.message });
      }
      if (!registrantRow) {
        return res.status(404).json({ ok: false, error: "Registrant not found" });
      }

      return res.status(200).json({
        ok: true,
        registrant: buildRegistrantResponse(registrantRow, updatedPass, new Map([[ownedEvent.id, ownedEvent.name]])),
      });
    }

    const eventId = typeof body.eventId === "string" ? body.eventId.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone = normalizeOptionalField(body.phone);
    const source = normalizeOptionalField(body.source);

    if (!eventId) {
      return res.status(400).json({ ok: false, error: "eventId is required" });
    }
    if (!name) {
      return res.status(400).json({ ok: false, error: "name is required" });
    }
    if (!email) {
      return res.status(400).json({ ok: false, error: "email is required" });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ ok: false, error: "email must be valid" });
    }

    const { data: eventRow, error: eventError } = await supabase
      .from("events")
      .select("id,name")
      .eq("id", eventId)
      .eq(accountId ? "account_id" : "user_id", accountId || authResult.user.id)
      .maybeSingle();

    if (eventError) {
      return res.status(500).json({ ok: false, error: eventError.message });
    }

    if (!eventRow) {
      return res.status(404).json({ ok: false, error: "Event not found" });
    }

    const { data: registrant, error: registrantError } = await supabase
      .from("registrants")
      .insert({
        event_id: eventId,
        name,
        email,
        phone,
        source,
      })
      .select("id,event_id,name,email,phone,source,created_at")
      .single();

    if (registrantError) {
      return res.status(500).json({ ok: false, error: registrantError.message });
    }

    const { pass, error: passError } = await createPassWithUniqueToken(supabase, eventId, registrant.id);

    if (passError) {
      await supabase.from("registrants").delete().eq("id", registrant.id);
      return res.status(500).json({ ok: false, error: passError.message });
    }

    return res.status(201).json({
      ok: true,
      registrant: buildRegistrantResponse(registrant, pass, new Map([[eventId, eventRow.name]])),
      pass,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
