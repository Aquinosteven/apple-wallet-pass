import { getAuthenticatedUser } from "./apiAuth.js";
import { getSupabaseAdmin } from "./ghlIntegration.js";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function parseInternalSupportEmails() {
  return String(process.env.SUPPORT_INTERNAL_EMAILS || "")
    .split(",")
    .map((entry) => normalizeEmail(entry))
    .filter(Boolean);
}

async function lookupSupportRole(supabase, userId) {
  const { data, error } = await supabase
    .from("support_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message || "Failed to load support role");
  return data?.role || null;
}

function inferRole({ dbRole, email }) {
  if (dbRole === "support_internal") return "support_internal";
  const allowedEmails = parseInternalSupportEmails();
  if (allowedEmails.includes(normalizeEmail(email))) return "support_internal";
  return "owner";
}

export async function getAccessContext(req) {
  const authResult = await getAuthenticatedUser(req);
  if (!authResult.user) {
    return {
      ok: false,
      status: authResult.status,
      error: authResult.error,
      context: null,
    };
  }

  const supabase = getSupabaseAdmin();
  const dbRole = await lookupSupportRole(supabase, authResult.user.id);
  const role = inferRole({ dbRole, email: authResult.user.email });

  return {
    ok: true,
    status: 200,
    error: null,
    context: {
      user: authResult.user,
      role,
      supabase,
    },
  };
}

export function resolveOwnerScope(accessContext, requestedOwnerUserId) {
  if (accessContext.role === "support_internal") {
    return requestedOwnerUserId ? String(requestedOwnerUserId) : null;
  }
  return accessContext.user.id;
}

export function assertInternalSupport(accessContext) {
  if (accessContext.role !== "support_internal") {
    return { ok: false, status: 403, error: "Internal support role required" };
  }
  return { ok: true, status: 200, error: null };
}

