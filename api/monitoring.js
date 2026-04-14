import { rejectDisallowedOrigin, setJsonCors } from "../lib/apiAuth.js";
import { getMonitoringConfig } from "../lib/monitoring.js";

function getPingToken(req) {
  return String(req.headers["x-uptime-token"] || req.headers["X-Uptime-Token"] || "").trim();
}

export default async function handler(req, res) {
  const cors = setJsonCors(req, res, ["GET", "POST", "OPTIONS"], false);
  if (req.method === "OPTIONS") return cors.originAllowed
    ? res.status(204).end()
    : res.status(403).json({ ok: false, error: "Origin not allowed" });
  if (rejectDisallowedOrigin(res, cors)) return;
  if (!["GET", "POST"].includes(req.method || "")) {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  const config = getMonitoringConfig();
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      monitoring: config,
      checkedAt: new Date().toISOString(),
    });
  }

  const expectedToken = String(process.env.UPTIME_MONITOR_PING_TOKEN || "").trim();
  if (expectedToken && getPingToken(req) !== expectedToken) {
    return res.status(401).json({ ok: false, error: "Invalid uptime token" });
  }

  return res.status(200).json({
    ok: true,
    status: "alive",
    checkedAt: new Date().toISOString(),
    sentryEnabled: config.sentry.enabled,
    uptimeEnabled: config.uptime.enabled,
  });
}
