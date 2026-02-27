function normalizeMetadata(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
}

export async function writeAuditLog(supabase, input) {
  const payload = {
    actor_user_id: input.actorUserId || null,
    owner_user_id: input.ownerUserId || null,
    action: String(input.action || "").slice(0, 120),
    target_type: String(input.targetType || "").slice(0, 120),
    target_id: input.targetId ? String(input.targetId).slice(0, 160) : null,
    metadata: normalizeMetadata(input.metadata),
  };

  if (!payload.action || !payload.target_type) {
    return { ok: false, error: "action and targetType are required" };
  }

  const { error } = await supabase.from("audit_logs").insert(payload);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

