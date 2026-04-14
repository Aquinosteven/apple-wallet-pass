import { getAuthenticatedUser, rejectDisallowedOrigin, setJsonCors } from "../../lib/apiAuth.js";
import { getSupabaseAdmin } from "../../lib/ghlIntegration.js";
import { getRequestedAccountId, resolveOrganizationAccess } from "../../lib/organizationAccess.js";

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
  const cors = setJsonCors(req, res, ["GET", "OPTIONS"]);
  if (req.method === "OPTIONS") return cors.originAllowed
    ? res.status(204).end()
    : res.status(403).json({ ok: false, error: "Origin not allowed" });
  if (rejectDisallowedOrigin(res, cors)) return;
  if (req.method !== "GET") {
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

    return res.status(200).json(buildContextPayload(access));
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
