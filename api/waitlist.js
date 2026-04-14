import { rejectDisallowedOrigin, setJsonCors } from "../lib/apiAuth.js";
import { getSupabaseAdmin } from "../lib/ghlIntegration.js";
import { sendWaitlistEmail } from "../lib/mailProvider.js";
import { captureMonitoringError } from "../lib/monitoring.js";
import { isValidEmail, readJsonBodyStrict } from "../lib/requestValidation.js";

function sanitizeText(value, max = 2000) {
  return String(value || "").trim().slice(0, max);
}

function getFirstHeaderValue(value) {
  if (Array.isArray(value)) return sanitizeText(value[0], 500);
  return sanitizeText(value, 500);
}

function getRequestIp(req) {
  const forwardedFor = getFirstHeaderValue(req.headers["x-forwarded-for"]);
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim().slice(0, 120);
  }
  return getFirstHeaderValue(req.socket?.remoteAddress);
}

export function validateWaitlistInput(input) {
  const payload = input && typeof input === "object" ? input : {};
  const name = sanitizeText(payload.name, 120);
  const email = sanitizeText(payload.email, 320).toLowerCase();
  const company = sanitizeText(payload.company, 160);
  const useCase = sanitizeText(payload.useCase, 240);
  const notes = sanitizeText(payload.notes, 2000);
  const source = sanitizeText(payload.source, 80) || "website_waitlist";
  const page = sanitizeText(payload.page, 200);

  if (!name) return { ok: false, error: "name is required" };
  if (!isValidEmail(email)) return { ok: false, error: "email must be valid" };

  return {
    ok: true,
    value: {
      name,
      email,
      company,
      useCase,
      notes,
      source,
      page,
    },
  };
}

export function createWaitlistHandler(deps = {}) {
  const getSupabaseAdminImpl = deps.getSupabaseAdmin || getSupabaseAdmin;
  const sendWaitlistEmailImpl = deps.sendWaitlistEmail || sendWaitlistEmail;

  return async function handler(req, res) {
    const cors = setJsonCors(req, res, ["POST", "OPTIONS"]);
    if (req.method === "OPTIONS") return cors.originAllowed
      ? res.status(204).end()
      : res.status(403).json({ ok: false, error: "Origin not allowed" });
    if (rejectDisallowedOrigin(res, cors)) return;
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method Not Allowed" });
    }

    try {
      const parsedBody = await readJsonBodyStrict(req);
      if (!parsedBody.ok) return res.status(parsedBody.status).json({ ok: false, error: parsedBody.error });

      const validated = validateWaitlistInput(parsedBody.body);
      if (!validated.ok) return res.status(400).json({ ok: false, error: validated.error });

      const supabase = getSupabaseAdminImpl();
      const insertPayload = {
        email: validated.value.email,
        name: validated.value.name,
        company: validated.value.company || null,
        use_case: validated.value.useCase || null,
        notes: validated.value.notes || null,
        source: validated.value.source,
        status: "pending",
        metadata: {
          page: validated.value.page || null,
          ip: getRequestIp(req) || null,
          user_agent: getFirstHeaderValue(req.headers["user-agent"]) || null,
          referrer: getFirstHeaderValue(req.headers.referer) || null,
        },
      };

      const { data: submission, error: createError } = await supabase
        .from("waitlist_signups")
        .upsert(insertPayload, { onConflict: "email" })
        .select("id,email,name,company,use_case,notes,source,status,created_at,updated_at")
        .single();

      if (createError) {
        return res.status(500).json({ ok: false, error: createError.message || "Failed to save waitlist signup" });
      }

      const mailText = [
        `Waitlist Signup ID: ${submission.id}`,
        `Name: ${submission.name}`,
        `Email: ${submission.email}`,
        `Company: ${submission.company || "Not provided"}`,
        `Use Case: ${submission.use_case || "Not provided"}`,
        `Source: ${submission.source || "website_waitlist"}`,
        "",
        submission.notes || "No additional notes provided.",
      ].join("\n");
      const mailResult = await sendWaitlistEmailImpl({
        subject: `[ShowFi Waitlist] ${submission.name}`,
        text: mailText,
        signupId: submission.id,
        requesterEmail: submission.email,
      });

      return res.status(201).json({
        ok: true,
        submission,
        mail: {
          ok: mailResult.ok,
          provider: mailResult.provider || process.env.MAIL_PROVIDER || "log",
          error: mailResult.ok ? null : mailResult.error,
        },
      });
    } catch (error) {
      captureMonitoringError(error, { endpoint: "/api/waitlist" });
      return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" });
    }
  };
}

export default createWaitlistHandler();
