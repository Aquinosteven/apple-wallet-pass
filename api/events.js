import { createClient } from "@supabase/supabase-js";
import { readJsonBodyStrict } from "../lib/requestValidation.js";
import { getEnv, loadLocalEnvFiles } from "../scripts/env-loader.js";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

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

function getBearerToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || typeof authHeader !== "string") {
    return null;
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token.trim();
}

async function getAuthenticatedUser(req) {
  const token = getBearerToken(req);
  if (!token) {
    return { user: null, error: "Missing Authorization bearer token", status: 401 };
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return { user: null, error: "Invalid or expired auth token", status: 401 };
    }

    return { user: data.user, error: null, status: 200 };
  } catch {
    return { user: null, error: "Invalid or expired auth token", status: 401 };
  }
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

function mapEventRowToApi(row) {
  const { date, time } = formatDateTimeParts(row.starts_at, row.timezone);
  const status = row.status === "published" ? "published" : "draft";

  return {
    id: row.id,
    name: row.name,
    date,
    time,
    timezone: row.timezone || "America/Chicago",
    description: row.description || undefined,
    status,
    ticketPublished: status === "published",
    ticketsIssued: 0,
    walletAdds: 0,
    checkIns: 0,
    lastIssuedAt: null,
    starts_at: row.starts_at || null,
  };
}

function buildEventMutation(body, userId) {
  const startsAt =
    coerceStartsAt(body?.starts_at) ||
    coerceStartsAt(body?.startDate) ||
    buildStartsAtFromParts(body?.date, body?.time);

  return {
    user_id: userId,
    name: String(body?.name || "").trim(),
    description: body?.description ? String(body.description) : null,
    timezone: body?.timezone ? String(body.timezone) : "America/Chicago",
    status: mapStatusToDb(body?.status),
    starts_at: startsAt,
  };
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!["GET", "POST", "PUT"].includes(req.method || "")) {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const authResult = await getAuthenticatedUser(req);
    if (!authResult.user) {
      return res.status(authResult.status).json({ ok: false, error: authResult.error });
    }
    const userId = authResult.user.id;
    const supabase = getSupabaseAdmin();

    if (req.method === "GET") {
      const eventId = typeof req.query?.eventId === "string" ? req.query.eventId : null;
      let query = supabase
        .from("events")
        .select("id,user_id,name,starts_at,timezone,description,status,created_at,updated_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (eventId) {
        query = query.eq("id", eventId).limit(1);
      }

      const { data, error } = await query;
      if (error) {
        return res.status(500).json({ ok: false, error: error.message });
      }

      const mapped = (data || []).map(mapEventRowToApi);
      if (eventId) {
        return res.status(200).json(mapped[0] || null);
      }
      return res.status(200).json(mapped);
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
      const payload = buildEventMutation(body, userId);
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

    const payload = buildEventMutation(body, userId);
    if (!payload.name) {
      return res.status(400).json({ ok: false, error: "name is required" });
    }

    const { data, error } = await supabase
      .from("events")
      .update(payload)
      .eq("id", eventId)
      .eq("user_id", userId)
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
