import { getAuthenticatedUser, rejectDisallowedOrigin, setJsonCors } from "../lib/apiAuth.js";
import { getSupabaseAdmin } from "../lib/ghlIntegration.js";
import {
  createWorkspaceForOrganization,
  getRequestedAccountId,
  resolveOrganizationAccess,
} from "../lib/organizationAccess.js";
import { readJsonBodyStrict } from "../lib/requestValidation.js";

function buildContextPayload(access) {
  return {
    ok: true,
    organizationId: access.organization?.id || null,
    organizationName: access.organization?.name || null,
    organizationSlug: access.organization?.slug || null,
    organizationType: access.organization?.type || "solo",
    organizationBillingState: access.organization?.billing_state || null,
    organizationPlanCode: access.organization?.plan_code || null,
    membershipRole: access.membershipRole || "owner",
    activeWorkspaceId: access.activeAccount?.id || null,
    activeWorkspaceSlug: access.activeAccount?.slug || null,
    activeWorkspaceName: access.activeAccount?.name || null,
    requiresWorkspaceSelection: access.requiresWorkspaceSelection === true,
    softWorkspaceLimit: Number.isFinite(access.organization?.soft_workspace_limit)
      ? access.organization.soft_workspace_limit
      : null,
    workspaces: Array.isArray(access.accounts)
      ? access.accounts.map((account) => ({
          id: account.id,
          slug: account.slug,
          name: account.name,
          billingState: account.billing_state,
          workspaceKind: account.workspace_kind || "client",
          workspaceStatus: account.workspace_status || "active",
          isPrimaryWorkspace: account.is_primary_workspace === true,
        }))
      : [],
  };
}

export default async function handler(req, res) {
  const cors = setJsonCors(req, res, ["GET", "POST", "OPTIONS"]);
  if (req.method === "OPTIONS") return cors.originAllowed
    ? res.status(204).end()
    : res.status(403).json({ ok: false, error: "Origin not allowed" });
  if (rejectDisallowedOrigin(res, cors)) return;
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth.user) {
      return res.status(auth.status).json({ ok: false, error: auth.error });
    }

    const supabase = getSupabaseAdmin();
    const access = await resolveOrganizationAccess(
      supabase,
      auth.user,
      getRequestedAccountId(req),
    );

    if (req.method === "GET") {
      return res.status(200).json(buildContextPayload(access));
    }

    const parsed = await readJsonBodyStrict(req);
    if (!parsed.ok) {
      return res.status(parsed.status).json({ ok: false, error: parsed.error });
    }

    const body = parsed.body && typeof parsed.body === "object" ? parsed.body : {};
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return res.status(400).json({ ok: false, error: "name is required" });
    }
    if (access.organization?.type !== "agency") {
      return res.status(403).json({ ok: false, error: "Only agency organizations can create workspaces." });
    }

    await createWorkspaceForOrganization(supabase, {
      organization: access.organization,
      ownerUser: auth.user,
      name,
    });

    const refreshed = await resolveOrganizationAccess(supabase, auth.user, null);
    const newestWorkspace = [...(refreshed.accounts || [])].sort((a, b) =>
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    )[0];

    return res.status(201).json(buildContextPayload({
      ...refreshed,
      activeAccount: newestWorkspace || refreshed.activeAccount,
      requiresWorkspaceSelection: false,
    }));
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
