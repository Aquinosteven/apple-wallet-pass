import { rejectDisallowedOrigin, setJsonCors } from "../../lib/apiAuth.js";
import { getSupabaseAdmin } from "../../lib/ghlIntegration.js";
import { buildClaimUrl } from "../../lib/baseUrl.js";
import { buildNoJsStatusHtml } from "../../lib/threadA/embedSession.js";

function normalizeText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

export default async function handler(req, res) {
  const cors = setJsonCors(req, res, ["GET", "OPTIONS"], false);
  if (req.method === "OPTIONS") return cors.originAllowed
    ? res.status(204).end()
    : res.status(403).json({ ok: false, error: "Origin not allowed" });
  if (rejectDisallowedOrigin(res, cors)) return;
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const token = normalizeText(req.query?.token);
    if (!token) {
      return res.status(400).json({ ok: false, error: "token is required" });
    }

    const supabase = getSupabaseAdmin();
    const { data: session, error: sessionError } = await supabase
      .from("embed_sessions")
      .select("id,issuance_request_id")
      .eq("status_page_token", token)
      .maybeSingle();

    if (sessionError) {
      return res.status(500).json({ ok: false, error: sessionError.message });
    }
    if (!session) {
      return res.status(404).json({ ok: false, error: "Session not found" });
    }

    const { data: issuance, error: issuanceError } = await supabase
      .from("issuance_requests")
      .select("id,status,claim_token,failure_reason")
      .eq("id", session.issuance_request_id)
      .maybeSingle();

    if (issuanceError) {
      return res.status(500).json({ ok: false, error: issuanceError.message });
    }

    if (issuance?.status === "completed" && issuance.claim_token) {
      const url = buildClaimUrl(req, issuance.claim_token);
      res.statusCode = 302;
      res.setHeader("Location", url);
      return res.end();
    }

    const pageUrl = `/api/embed/status-page?token=${encodeURIComponent(token)}`;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(buildNoJsStatusHtml(pageUrl));
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
