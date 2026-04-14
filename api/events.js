import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedUser, rejectDisallowedOrigin, setJsonCors } from "../lib/apiAuth.js";
import { readJsonBodyStrict } from "../lib/requestValidation.js";
import { getEnv, loadLocalEnvFiles } from "../scripts/env-loader.js";
import { getRequestedAccountId, resolveOrganizationAccess } from "../lib/organizationAccess.js";

const WALLET_ADD_EVENT_TYPES = ["apple_wallet_added", "google_wallet_saved"];

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

function mapStatusToDb(status) {
  if (status === "draft") return "draft";
  if (status === "published" || status === "ready" || status === "active" || status === "ended") {
    return "published";
  }
  return "draft";
}

function coerceStartsAt(input) {
  if (!input) return null;
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function buildStartsAtFromParts(date, time) {
  if (!date || typeof date !== "string") return null;
  const timePart = typeof time === "string" && time ? time : "00:00";
  return coerceStartsAt(`${date}T${timePart}`);
}

function formatDateTimeParts(startsAt, timezone) {
  if (!startsAt) return { date: undefined, time: undefined };
  const parsed = new Date(startsAt);
  if (Number.isNaN(parsed.getTime())) return { date: undefined, time: undefined };

  const safeTimezone = timezone || "America/Chicago";
  const date = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: safeTimezone,
  }).format(parsed);
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: safeTimezone,
  }).format(parsed);

  return { date, time };
}

function formatLastIssuedAt(value, timezone) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: timezone || "America/Chicago",
  }).format(parsed);
}

export async function buildEventStatsById(supabase, rows) {
  const eventIds = (rows || []).map((row) => row.id).filter(Boolean);
  if (!eventIds.length) return new Map();

  const { data: passRows, error: passError } = await supabase
    .from("passes")
    .select("event_id,created_at,claimed_at,status")
    .in("event_id", eventIds);

  if (passError) {
    throw new Error(passError.message || "Failed to load event pass metrics");
  }

  const { data: walletAddRows, error: walletAddError } = await supabase
    .from("claim_events")
    .select("event_id,event_type")
    .in("event_id", eventIds)
    .in("event_type", WALLET_ADD_EVENT_TYPES);

  if (walletAddError) {
    throw new Error(walletAddError.message || "Failed to load event wallet-add metrics");
  }

  const statsById = new Map(eventIds.map((eventId) => [
    eventId,
    {
      ticketsIssued: 0,
      walletAdds: 0,
      checkIns: 0,
      lastIssuedAt: null,
    },
  ]));

  for (const passRow of passRows || []) {
    const current = statsById.get(passRow.event_id);
    if (!current) continue;

    current.ticketsIssued += 1;
    if (String(passRow.status || "").toLowerCase() === "checked_in") current.checkIns += 1;
    if (!current.lastIssuedAt || new Date(passRow.created_at).getTime() > new Date(current.lastIssuedAt).getTime()) {
      current.lastIssuedAt = passRow.created_at;
    }
  }

  for (const eventRow of walletAddRows || []) {
    const current = statsById.get(eventRow.event_id);
    if (!current) continue;
    current.walletAdds += 1;
  }

  return statsById;
}

function mapEventRowToApi(row, statsById = new Map()) {
  const { date, time } = formatDateTimeParts(row.starts_at, row.timezone);
  const status = row.status === "published" ? "published" : "draft";
  const stats = statsById.get(row.id) || {
    ticketsIssued: 0,
    walletAdds: 0,
    checkIns: 0,
    lastIssuedAt: null,
  };

  return {
    id: row.id,
    name: row.name,
    date,
    time,
    timezone: row.timezone || "America/Chicago",
    description: row.description || undefined,
    status,
    ticketPublished: status === "published",
    ticketsIssued: stats.ticketsIssued,
    walletAdds: stats.walletAdds,
    checkIns: stats.checkIns,
    lastIssuedAt: formatLastIssuedAt(stats.lastIssuedAt, row.timezone),
    startsAt: row.starts_at || null,
  };
}

function buildEventMutation(body, userId, accountId) {
  const startsAt =
    coerceStartsAt(body?.starts_at) ||
    coerceStartsAt(body?.startDate) ||
    buildStartsAtFromParts(body?.date, body?.time);

  return {
    user_id: userId,
    account_id: accountId,
    name: String(body?.name || "").trim(),
    description: body?.description ? String(body.description) : null,
    timezone: body?.timezone ? String(body.timezone) : "America/Chicago",
    status: mapStatusToDb(body?.status),
    starts_at: startsAt,
  };
}

export default async function handler(req, res) {
  const cors = setJsonCors(req, res, ["GET", "POST", "PUT", "DELETE", "OPTIONS"]);
  if (req.method === "OPTIONS") return cors.originAllowed
    ? res.status(204).end()
    : res.status(403).json({ ok: false, error: "Origin not allowed" });
  if (rejectDisallowedOrigin(res, cors)) return;
  if (!["GET", "POST", "PUT", "DELETE"].includes(req.method || "")) {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const authResult = await getAuthenticatedUser(req);
    if (!authResult.user) {
      return res.status(authResult.status).json({ ok: false, error: authResult.error });
    }
    const supabase = getSupabaseAdmin();
    const access = await resolveOrganizationAccess(supabase, authResult.user, getRequestedAccountId(req));
    const userId = authResult.user.id;
    const accountId = access.activeAccount?.id || null;

    if (req.method === "GET") {
      const eventId = typeof req.query?.eventId === "string" ? req.query.eventId : null;
      let query = supabase
        .from("events")
        .select("id,user_id,name,starts_at,timezone,description,status,created_at,updated_at")
        .eq(accountId ? "account_id" : "user_id", accountId || userId)
        .order("created_at", { ascending: false });

      if (eventId) {
        query = query.eq("id", eventId).limit(1);
      }

      const { data, error } = await query;
      if (error) {
        return res.status(500).json({ ok: false, error: error.message });
      }

      const statsById = await buildEventStatsById(supabase, data || []);
      const mapped = (data || []).map((row) => mapEventRowToApi(row, statsById));
      if (eventId) {
        if (!mapped.length) {
          return res.status(404).json({ ok: false, error: "Event not found" });
        }
        return res.status(200).json(mapped[0]);
      }
      return res.status(200).json(mapped);
    }

    if (req.method === "DELETE") {
      const eventId = typeof req.query?.eventId === "string" ? req.query.eventId.trim() : "";
      if (!eventId) {
        return res.status(400).json({ ok: false, error: "eventId is required for delete" });
      }

      const { data: deletedRows, error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId)
        .eq(accountId ? "account_id" : "user_id", accountId || userId)
        .select("id");

      if (error) {
        return res.status(500).json({ ok: false, error: error.message });
      }

      if (!(deletedRows || []).length) {
        return res.status(404).json({ ok: false, error: "Event not found" });
      }

      return res.status(200).json({ ok: true });
    }

    const parsedBody = await readJsonBodyStrict(req);
    if (!parsedBody.ok) {
      return res.status(parsedBody.status).json({ ok: false, error: parsedBody.error });
    }
    const body = parsedBody.body;
    if (!body || typeof body !== "object") {
      return res.status(400).json({ ok: false, error: "Invalid JSON body" });
    }

    if (req.method === "POST") {
      const payload = buildEventMutation(body, userId, accountId);
      if (!payload.name) {
        return res.status(400).json({ ok: false, error: "name is required" });
      }

      const { data, error } = await supabase
        .from("events")
        .insert(payload)
        .select("id,user_id,name,starts_at,timezone,description,status,created_at,updated_at")
        .single();

      if (error) {
        return res.status(500).json({ ok: false, error: error.message });
      }

      return res.status(201).json(mapEventRowToApi(data));
    }

    const eventId = typeof body.id === "string" ? body.id : "";
    if (!eventId) {
      return res.status(400).json({ ok: false, error: "id is required for update" });
    }

    const payload = buildEventMutation(body, userId, accountId);
    if (!payload.name) {
      return res.status(400).json({ ok: false, error: "name is required" });
    }

    const { data, error } = await supabase
      .from("events")
      .update(payload)
      .eq("id", eventId)
      .eq(accountId ? "account_id" : "user_id", accountId || userId)
      .select("id,user_id,name,starts_at,timezone,description,status,created_at,updated_at")
      .single();

    if (error) {
      const statusCode = error.code === "PGRST116" ? 404 : 500;
      return res.status(statusCode).json({ ok: false, error: error.message });
    }

    return res.status(200).json(mapEventRowToApi(data));
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
