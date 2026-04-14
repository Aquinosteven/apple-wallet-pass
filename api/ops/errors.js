import { getAuthenticatedUser, rejectDisallowedOrigin, setJsonCors } from "../../lib/apiAuth.js";
import { getSupabaseAdmin } from "../../lib/ghlIntegration.js";

function parseLimit(req) {
  const raw = req?.query?.limit;
  const value = typeof raw === "string" ? Number(raw) : Array.isArray(raw) ? Number(raw[0]) : 25;
  if (!Number.isFinite(value) || value <= 0) return 25;
  return Math.min(Math.floor(value), 100);
}

function parseEventId(req) {
  const eventId = req?.query?.eventId;
  if (typeof eventId === "string") return eventId.trim();
  if (Array.isArray(eventId) && typeof eventId[0] === "string") return eventId[0].trim();
  return "";
}

function isMissingRelationError(error) {
  const message = String(error?.message || "").toLowerCase();
  const details = String(error?.details || "").toLowerCase();
  return message.includes("does not exist")
    || message.includes("could not find the table")
    || details.includes("does not exist");
}

export default async function handler(req, res) {
  const cors = setJsonCors(req, res, ["GET", "OPTIONS"]);
  if (req.method === "OPTIONS") return cors.originAllowed
    ? res.status(204).end()
    : res.status(403).json({ ok: false, error: "Origin not allowed" });
  if (rejectDisallowedOrigin(res, cors)) return;
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth.user) {
      return res.status(auth.status).json({ ok: false, error: auth.error });
    }

    const eventId = parseEventId(req);
    const limit = parseLimit(req);
    const supabase = getSupabaseAdmin();

    let eventScope = supabase
      .from("events")
      .select("id")
      .eq("user_id", auth.user.id);
    if (eventId) eventScope = eventScope.eq("id", eventId);

    const { data: events, error: eventsError } = await eventScope;
    if (eventsError) {
      return res.status(500).json({ ok: false, error: eventsError.message });
    }
    const eventIds = (events || []).map((row) => row.id);

    if (eventIds.length === 0) {
      return res.status(200).json({ ok: true, items: [] });
    }

    const { data: items, error } = await supabase
      .from("wallet_ops_errors")
      .select("id,event_id,pass_id,scope,severity,message,metadata,resolved_at,created_at")
      .in("event_id", eventIds)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      if (isMissingRelationError(error)) {
        return res.status(200).json({ ok: true, items: [] });
      }
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(200).json({
      ok: true,
      items: items || [],
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
