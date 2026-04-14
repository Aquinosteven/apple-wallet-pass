import { getAuthenticatedUser } from "./apiAuth.js";
import { getSupabaseAdmin } from "./ghlIntegration.js";

const ADMIN_ROLE_LEVELS = {
  owner: 0,
  support_read: 1,
  support_write: 2,
  admin_super: 3,
};

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
  if (dbRole === "support_internal") return "admin_super";
  if (dbRole === "support_read" || dbRole === "support_write" || dbRole === "admin_super") {
    return dbRole;
  }
  const allowedEmails = parseInternalSupportEmails();
  if (allowedEmails.includes(normalizeEmail(email))) return "admin_super";
  return "owner";
}

function normalizeMinimumRole(value) {
  if (value === "support_internal") return "admin_super";
  if (value === "support_read" || value === "support_write" || value === "admin_super") return value;
  return "owner";
}

export function hasAdminAccess(role) {
  return ADMIN_ROLE_LEVELS[normalizeMinimumRole(role)] >= ADMIN_ROLE_LEVELS.support_read;
}

export function hasAdminWriteAccess(role) {
  return ADMIN_ROLE_LEVELS[normalizeMinimumRole(role)] >= ADMIN_ROLE_LEVELS.support_write;
}

export function hasAdminSuperAccess(role) {
  return ADMIN_ROLE_LEVELS[normalizeMinimumRole(role)] >= ADMIN_ROLE_LEVELS.admin_super;
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
  if (hasAdminAccess(accessContext.role)) {
    return requestedOwnerUserId ? String(requestedOwnerUserId) : null;
  }
  return accessContext.user.id;
}

export function assertInternalSupport(accessContext) {
  if (!hasAdminWriteAccess(accessContext.role)) {
    return { ok: false, status: 403, error: "Internal support role required" };
  }
  return { ok: true, status: 200, error: null };
}

export function assertAdminAccess(accessContext, minimumRole = "support_read") {
  const normalized = normalizeMinimumRole(minimumRole);
  if (ADMIN_ROLE_LEVELS[normalizeMinimumRole(accessContext.role)] < ADMIN_ROLE_LEVELS[normalized]) {
    return { ok: false, status: 403, error: "Admin access denied" };
  }
  return { ok: true, status: 200, error: null };
}

export function getLegacyRoleLabel(role) {
  return hasAdminAccess(role) ? "support_internal" : "owner";
}
