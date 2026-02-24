import { readJsonBodyStrict, validateStringField } from "../lib/requestValidation.js";
import { isAllowedClaimEventType, trackClaimEventFromRequest } from "../lib/claimEvents.js";
import { limiters } from "../lib/rateLimit.js";
import { maybeLogSuspiciousRequest, sendRateLimitExceeded, setNoStore } from "../lib/security.js";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function getIp(req) {
  return String(req?.headers?.["x-forwarded-for"] || req?.socket?.remoteAddress || "unknown")
    .split(",")[0]
    .trim();
}

export default async function handler(req, res) {
  setCors(res);
  setNoStore(res);
  maybeLogSuspiciousRequest(req, { endpoint: "/api/claim-events" });

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method Not Allowed" });

  const ip = getIp(req);
  const ipLimit = limiters.generateByIp(ip);
  if (!ipLimit.allowed) {
    return sendRateLimitExceeded(res, ipLimit.retryAfterSeconds);
  }

  const parsedBody = await readJsonBodyStrict(req);
  if (!parsedBody.ok) {
    return res.status(parsedBody.status).json({ ok: false, error: parsedBody.error });
  }

  const body = parsedBody.body || {};
  const eventTypeValidation = validateStringField(body.eventType, {
    field: "eventType",
    required: true,
    min: 3,
    max: 64,
    pattern: /^[a-z_]+$/,
  });
  if (!eventTypeValidation.ok) {
    return res.status(400).json({ ok: false, error: eventTypeValidation.error });
  }

  if (!isAllowedClaimEventType(eventTypeValidation.value)) {
    return res.status(400).json({ ok: false, error: "Unsupported eventType" });
  }

  const tracked = await trackClaimEventFromRequest(req, {
    eventType: eventTypeValidation.value,
    claimId: typeof body.claimId === "string" ? body.claimId : null,
    passId: typeof body.passId === "string" ? body.passId : null,
    eventId: typeof body.eventId === "string" ? body.eventId : null,
    userId: typeof body.userId === "string" ? body.userId : null,
    metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {},
  });

  if (!tracked.ok && !tracked.skipped) {
    return res.status(500).json({ ok: false, error: tracked.error || "Failed to track event" });
  }

  return res.status(200).json({ ok: true });
}
