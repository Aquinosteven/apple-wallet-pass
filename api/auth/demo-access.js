import { rejectDisallowedOrigin, setJsonCors } from "../../lib/apiAuth.js";
import { readJsonBodyStrict } from "../../lib/requestValidation.js";
import { createTokenBucketLimiter } from "../../lib/rateLimit.js";
import { getClientIp, sendRateLimitExceeded, setNoStore } from "../../lib/security.js";

const demoAccessLimiter = createTokenBucketLimiter({
  scope: "demo_access_ip",
  capacity: 5,
  windowSeconds: 300,
});

function normalizeText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function getDemoSignupPassword() {
  return normalizeText(process.env.DEMO_SIGNUP_PASSWORD);
}

export default async function handler(req, res) {
  const cors = setJsonCors(req, res, ["POST", "OPTIONS"], false);
  setNoStore(res);
  if (req.method === "OPTIONS") return cors.originAllowed
    ? res.status(204).end()
    : res.status(403).json({ ok: false, error: "Origin not allowed" });
  if (rejectDisallowedOrigin(res, cors)) return;
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const byIp = demoAccessLimiter(getClientIp(req));
    if (!byIp.allowed) {
      return sendRateLimitExceeded(res, byIp.retryAfterSeconds);
    }

    const configuredPassword = getDemoSignupPassword();
    if (!configuredPassword) {
      return res.status(503).json({ ok: false, error: "Demo access is not configured." });
    }

    const parsed = await readJsonBodyStrict(req);
    if (!parsed.ok) {
      return res.status(parsed.status).json({ ok: false, error: parsed.error });
    }

    const body = parsed.body && typeof parsed.body === "object" ? parsed.body : {};
    const password = normalizeText(body.password);

    if (!password) {
      return res.status(400).json({ ok: false, error: "Password is required." });
    }

    if (password !== configuredPassword) {
      return res.status(401).json({ ok: false, error: "Incorrect password." });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
