import { getAuthenticatedUser, setJsonCors } from "../../lib/apiAuth.js";
import { getSupabaseAdmin } from "../../lib/ghlIntegration.js";
import { buildOpsHealthBadges } from "../../lib/walletOps.js";

function isMissingRelationError(error) {
  const message = String(error?.message || "").toLowerCase();
  const details = String(error?.details || "").toLowerCase();
  return message.includes("does not exist")
    || message.includes("could not find the table")
    || details.includes("does not exist");
}

function parseEventId(req) {
  const eventId = req?.query?.eventId;
  if (typeof eventId === "string") return eventId.trim();
  if (Array.isArray(eventId) && typeof eventId[0] === "string") return eventId[0].trim();
  return "";
}

async function countRows(query) {
  const { count, error } = await query;
  if (error) {
    if (isMissingRelationError(error)) return 0;
    throw new Error(error.message || "Failed to load operations summary");
  }
  return Number.isFinite(Number(count)) ? Number(count) : 0;
}

export default async function handler(req, res) {
  setJsonCors(res, ["GET", "OPTIONS"]);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth.user) {
      return res.status(auth.status).json({ ok: false, error: auth.error });
    }

    const eventId = parseEventId(req);
    const supabase = getSupabaseAdmin();

    let eventsQuery = supabase
      .from("events")
      .select("id")
      .eq("user_id", auth.user.id);
    if (eventId) eventsQuery = eventsQuery.eq("id", eventId);
    const { data: events, error: eventsError } = await eventsQuery;
    if (eventsError) {
      return res.status(500).json({ ok: false, error: eventsError.message });
    }
    const eventIds = (events || []).map((row) => row.id);

    if (eventIds.length === 0) {
      const badges = buildOpsHealthBadges({
        walletFailed: 0,
        reminderFailed: 0,
        deadLetters: 0,
        feedCount: 0,
      });
      return res.status(200).json({
        ok: true,
        eventId: eventId || null,
        issuedCount: 0,
        ...badges,
      });
    }

    const { data: passIds, error: passIdsError } = await supabase
      .from("passes")
      .select("id,event_id")
      .in("event_id", eventIds);
    if (passIdsError) {
      return res.status(500).json({ ok: false, error: passIdsError.message });
    }
    const passIdList = (passIds || []).map((row) => row.id);
    const eventIdList = Array.from(new Set([...eventIds, ...(passIds || []).map((row) => row.event_id).filter(Boolean)]));

    const walletFailed = passIdList.length > 0
      ? await countRows(
        supabase
          .from("wallet_update_jobs")
          .select("id", { count: "exact", head: true })
          .in("pass_id", passIdList)
          .in("status", ["failed", "dead_letter"])
      )
      : 0;

    const reminderFailed = eventIdList.length > 0
      ? await countRows(
        supabase
          .from("reminder_jobs")
          .select("id", { count: "exact", head: true })
          .in("event_id", eventIdList)
          .in("status", ["failed", "dead_letter"])
      )
      : 0;

    const deadLetters = eventIdList.length > 0
      ? await countRows(
        supabase
          .from("dead_letter_queue")
          .select("id", { count: "exact", head: true })
          .in("event_id", eventIdList)
      )
      : 0;

    const feedCount = eventIdList.length > 0
      ? await countRows(
        supabase
          .from("wallet_ops_errors")
          .select("id", { count: "exact", head: true })
          .is("resolved_at", null)
          .in("event_id", eventIdList)
      )
      : 0;

    const badges = buildOpsHealthBadges({
      walletFailed,
      reminderFailed,
      deadLetters,
      feedCount,
    });

    const issuedCount = await countRows(
      supabase
        .from("passes")
        .select("id", { count: "exact", head: true })
        .in("event_id", eventIds)
    );

    return res.status(200).json({
      ok: true,
      eventId: eventId || null,
      issuedCount,
      ...badges,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
