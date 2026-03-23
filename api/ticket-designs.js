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

function asOptionalString(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function mapTicketDesignRowToApi(row) {
  if (!row) return null;
  return {
    id: row.id,
    eventId: row.event_id,
    backgroundColor: row.background_color,
    barcodeEnabled: Boolean(row.barcode_enabled),
    logoUrl: row.logo_url,
    stripUrl: row.strip_url,
  };
}

async function ensureOwnedEventExists(supabase, userId, eventId) {
  const { data, error } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return { ok: false, status: 500, error: error.message };
  }

  if (!data) {
    return { ok: false, status: 404, error: "Event not found" };
  }

  return { ok: true, status: 200, error: null };
}

function buildTicketDesignPayload(body, userId, eventId) {
  return {
    user_id: userId,
    event_id: eventId,
    background_color: asOptionalString(body?.backgroundColor) || "#0B1220",
    barcode_enabled: typeof body?.barcodeEnabled === "boolean" ? body.barcodeEnabled : true,
    logo_url: asOptionalString(body?.logoUrl),
    strip_url: asOptionalString(body?.stripUrl),
  };
}

async function resolveEventIdForUpdate(supabase, userId, body) {
  const bodyEventId = asOptionalString(body?.eventId);
  if (bodyEventId) {
    return { eventId: bodyEventId, status: 200, error: null };
  }

  const id = asOptionalString(body?.id);
  if (!id) {
    return { eventId: null, status: 400, error: "eventId or id is required for update" };
  }

  const { data, error } = await supabase
    .from("ticket_designs")
    .select("event_id")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return { eventId: null, status: 500, error: error.message };
  }

  if (!data?.event_id) {
    return { eventId: null, status: 404, error: "Ticket design not found" };
  }

  return { eventId: data.event_id, status: 200, error: null };
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
      const eventId = asOptionalString(req.query?.eventId);
      const designId = asOptionalString(req.query?.id) || asOptionalString(req.query?.ticketDesignId);

      let query = supabase
        .from("ticket_designs")
        .select("id,user_id,event_id,background_color,barcode_enabled,logo_url,strip_url,created_at,updated_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (eventId) {
        query = query.eq("event_id", eventId).limit(1);
      }
      if (designId) {
        query = query.eq("id", designId).limit(1);
      }

      const { data, error } = await query;
      if (error) {
        return res.status(500).json({ ok: false, error: error.message });
      }

      const mapped = (data || []).map(mapTicketDesignRowToApi);
      if (eventId || designId) {
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
      const eventId = asOptionalString(body.eventId);
      if (!eventId) {
        return res.status(400).json({ ok: false, error: "eventId is required" });
      }

      const ownsEvent = await ensureOwnedEventExists(supabase, userId, eventId);
      if (!ownsEvent.ok) {
        return res.status(ownsEvent.status).json({ ok: false, error: ownsEvent.error });
      }

      const payload = buildTicketDesignPayload(body, userId, eventId);
      const { data, error } = await supabase
        .from("ticket_designs")
        .insert(payload)
        .select("id,user_id,event_id,background_color,barcode_enabled,logo_url,strip_url,created_at,updated_at")
        .single();

      if (error) {
        const statusCode = error.code === "23505" ? 409 : 500;
        return res.status(statusCode).json({ ok: false, error: error.message });
      }

      return res.status(201).json(mapTicketDesignRowToApi(data));
    }

    const eventIdResult = await resolveEventIdForUpdate(supabase, userId, body);
    if (!eventIdResult.eventId) {
      return res.status(eventIdResult.status).json({ ok: false, error: eventIdResult.error });
    }

    const ownsEvent = await ensureOwnedEventExists(supabase, userId, eventIdResult.eventId);
    if (!ownsEvent.ok) {
      return res.status(ownsEvent.status).json({ ok: false, error: ownsEvent.error });
    }

    const payload = buildTicketDesignPayload(body, userId, eventIdResult.eventId);

    const { data, error } = await supabase
      .from("ticket_designs")
      .upsert(payload, { onConflict: "event_id" })
      .select("id,user_id,event_id,background_color,barcode_enabled,logo_url,strip_url,created_at,updated_at")
      .single();

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(200).json(mapTicketDesignRowToApi(data));
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
