import { setJsonCors } from "../../lib/apiAuth.js";
import { getSupabaseAdmin } from "../../lib/ghlIntegration.js";
import { readJsonBodyStrict } from "../../lib/requestValidation.js";

function normalizeText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function isAlreadyRegisteredError(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("already been registered")
    || message.includes("user already registered")
    || message.includes("already exists");
}

export default async function handler(req, res) {
  setJsonCors(res, ["POST", "OPTIONS"], false);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const parsed = await readJsonBodyStrict(req);
    if (!parsed.ok) {
      return res.status(parsed.status).json({ ok: false, error: parsed.error });
    }

    const body = parsed.body && typeof parsed.body === "object" ? parsed.body : {};
    const email = normalizeText(body.email).toLowerCase();
    const password = normalizeText(body.password);

    if (!email || !password) {
      return res.status(400).json({ ok: false, error: "Email and password are required." });
    }

    if (password.length < 6) {
      return res.status(400).json({ ok: false, error: "Use a password with at least 6 characters." });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        signup_source: "web",
      },
    });

    if (error) {
      const status = isAlreadyRegisteredError(error) ? 409 : 400;
      return res.status(status).json({ ok: false, error: error.message || "Failed to create account." });
    }

    return res.status(200).json({
      ok: true,
      userId: data.user?.id || null,
      email: data.user?.email || email,
      emailConfirmed: true,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
