import { setJsonCors } from "../lib/apiAuth.js";
import { readJsonBodyStrict } from "../lib/requestValidation.js";
import { getAccessContext, resolveOwnerScope, assertInternalSupport } from "../lib/threadCAccess.js";
import { writeAuditLog } from "../lib/auditLog.js";
import { captureMonitoringError } from "../lib/monitoring.js";

const PROMO_CAP = 100;
const PROMO_BASELINE_CLAIMED = 17;
const APP_CONFIG_KEYS = {
  promoCounter: "promo.counter",
  planLimits: "plan.limits",
};

async function fetchAppConfig(supabase, key) {
  const { data, error } = await supabase
    .from("app_config")
    .select("key,value,updated_at")
    .eq("key", key)
    .maybeSingle();
  if (error) throw new Error(error.message || `Failed to load config: ${key}`);
  return data || null;
}

async function upsertAppConfig(supabase, key, value) {
  const payload = { key, value };
  const { data, error } = await supabase
    .from("app_config")
    .upsert(payload, { onConflict: "key" })
    .select("key,value,updated_at")
    .single();
  if (error) throw new Error(error.message || `Failed to save config: ${key}`);
  return data;
}

async function lookupEventIdsForOwner(supabase, ownerUserId) {
  if (!ownerUserId) return null;
  const { data, error } = await supabase.from("events").select("id").eq("user_id", ownerUserId);
  if (error) throw new Error(error.message || "Failed to load owner events");
  return (data || []).map((row) => row.id);
}

async function countClaimedPasses(supabase, ownerUserId) {
  const eventIds = await lookupEventIdsForOwner(supabase, ownerUserId);
  let query = supabase.from("passes").select("id", { count: "exact", head: true }).not("claimed_at", "is", null);
  if (Array.isArray(eventIds)) {
    if (!eventIds.length) return 0;
    query = query.in("event_id", eventIds);
  }
  const { count, error } = await query;
  if (error) throw new Error(error.message || "Failed to count claimed passes");
  return count || 0;
}

async function getPromoCounter(supabase, ownerUserId) {
  const [configRow, claimedFromData] = await Promise.all([
    fetchAppConfig(supabase, APP_CONFIG_KEYS.promoCounter),
    countClaimedPasses(supabase, ownerUserId),
  ]);

  const configuredClaimed = Number(configRow?.value?.claimed);
  const cap = Number(configRow?.value?.cap) > 0 ? Number(configRow.value.cap) : PROMO_CAP;
  const baselineClaimed = Number.isFinite(configuredClaimed) ? configuredClaimed : PROMO_BASELINE_CLAIMED;
  const claimed = Math.max(claimedFromData, baselineClaimed);

  return {
    claimed,
    cap,
    remaining: Math.max(cap - claimed, 0),
    source: { baselineClaimed, claimedFromData },
  };
}

async function listFailedJobs(supabase, ownerUserId) {
  let query = supabase
    .from("admin_jobs")
    .select("id,owner_user_id,job_type,status,error_message,attempt_count,created_at,updated_at,replayed_from_id")
    .eq("status", "failed")
    .order("created_at", { ascending: false })
    .limit(100);
  if (ownerUserId) query = query.eq("owner_user_id", ownerUserId);
  const { data, error } = await query;
  if (error) throw new Error(error.message || "Failed to load jobs");
  return data || [];
}

async function listAuditLogs(supabase, ownerUserId) {
  const oneYearAgo = new Date(Date.now() - (365 * 24 * 60 * 60 * 1000)).toISOString();
  let query = supabase
    .from("audit_logs")
    .select("id,actor_user_id,owner_user_id,action,target_type,target_id,metadata,created_at")
    .gte("created_at", oneYearAgo)
    .order("created_at", { ascending: false })
    .limit(200);
  if (ownerUserId) query = query.eq("owner_user_id", ownerUserId);
  const { data, error } = await query;
  if (error) throw new Error(error.message || "Failed to load audit logs");
  return data || [];
}

async function listPlanHooks(supabase) {
  const configRow = await fetchAppConfig(supabase, APP_CONFIG_KEYS.planLimits);
  return configRow?.value || {
    plan: "v1",
    limits: {
      monthly_passes: 10000,
      support_seats: 2,
    },
  };
}

async function retryFailedJob(supabase, actorUserId, jobId) {
  const { data: job, error: loadError } = await supabase
    .from("admin_jobs")
    .select("id,owner_user_id,job_type,payload,status,error_message,attempt_count")
    .eq("id", jobId)
    .maybeSingle();
  if (loadError) throw new Error(loadError.message || "Failed to load job");
  if (!job) return { ok: false, status: 404, error: "Job not found" };
  if (job.status !== "failed") return { ok: false, status: 400, error: "Only failed jobs can be retried" };

  const nextPayload = {
    owner_user_id: job.owner_user_id,
    job_type: job.job_type,
    payload: job.payload || {},
    status: "queued",
    replayed_from_id: job.id,
    attempt_count: 0,
  };
  const { data: queuedJob, error: queueError } = await supabase
    .from("admin_jobs")
    .insert(nextPayload)
    .select("id,owner_user_id,job_type,status,created_at,replayed_from_id")
    .single();
  if (queueError) throw new Error(queueError.message || "Failed to queue retry");

  await writeAuditLog(supabase, {
    actorUserId,
    ownerUserId: job.owner_user_id,
    action: "admin.job.retry",
    targetType: "admin_job",
    targetId: job.id,
    metadata: { queuedJobId: queuedJob.id },
  });

  return { ok: true, status: 200, queuedJob };
}

export function createAdminHandler(deps = {}) {
  const getAccessContextImpl = deps.getAccessContext || getAccessContext;
  const resolveOwnerScopeImpl = deps.resolveOwnerScope || resolveOwnerScope;
  const assertInternalSupportImpl = deps.assertInternalSupport || assertInternalSupport;
  const writeAuditLogImpl = deps.writeAuditLog || writeAuditLog;
  const getPromoCounterImpl = deps.getPromoCounter || getPromoCounter;
  const listPlanHooksImpl = deps.listPlanHooks || listPlanHooks;
  const listFailedJobsImpl = deps.listFailedJobs || listFailedJobs;
  const listAuditLogsImpl = deps.listAuditLogs || listAuditLogs;
  const upsertAppConfigImpl = deps.upsertAppConfig || upsertAppConfig;
  const retryFailedJobImpl = deps.retryFailedJob || retryFailedJob;

  return async function handler(req, res) {
    setJsonCors(res, ["GET", "POST", "OPTIONS"]);
    if (req.method === "OPTIONS") return res.status(204).end();
    if (!["GET", "POST"].includes(req.method || "")) {
      return res.status(405).json({ ok: false, error: "Method Not Allowed" });
    }

    try {
      const access = await getAccessContextImpl(req);
      if (!access.ok) return res.status(access.status).json({ ok: false, error: access.error });
      const supabase = access.context.supabase;
      const ownerUserId = resolveOwnerScopeImpl(access.context, req.query?.ownerUserId);

      if (req.method === "GET") {
        const [promoCounter, planHooks, failedJobs, auditLogs] = await Promise.all([
          getPromoCounterImpl(supabase, ownerUserId),
          listPlanHooksImpl(supabase),
          listFailedJobsImpl(supabase, ownerUserId),
          listAuditLogsImpl(supabase, ownerUserId),
        ]);

        return res.status(200).json({
          ok: true,
          role: access.context.role,
          ownerScope: ownerUserId || "all",
          promoCounter,
          planHooks,
          failedJobs,
          auditLogs,
        });
      }

      const parsedBody = await readJsonBodyStrict(req);
      if (!parsedBody.ok) return res.status(parsedBody.status).json({ ok: false, error: parsedBody.error });
      const action = String(parsedBody.body?.action || "").trim();

      if (action === "promo.override") {
        const supportGate = assertInternalSupportImpl(access.context);
        if (!supportGate.ok) return res.status(supportGate.status).json({ ok: false, error: supportGate.error });

        const claimed = Number(parsedBody.body?.claimed);
        if (!Number.isFinite(claimed) || claimed < 0) {
          return res.status(400).json({ ok: false, error: "claimed must be a non-negative number" });
        }
        const cap = Number(parsedBody.body?.cap);
        const value = {
          claimed,
          cap: Number.isFinite(cap) && cap > 0 ? cap : PROMO_CAP,
        };

        await upsertAppConfigImpl(supabase, APP_CONFIG_KEYS.promoCounter, value);
        await writeAuditLogImpl(supabase, {
          actorUserId: access.context.user.id,
          ownerUserId: null,
          action: "admin.promo.override",
          targetType: "app_config",
          targetId: APP_CONFIG_KEYS.promoCounter,
          metadata: value,
        });
        return res.status(200).json({ ok: true, promoCounter: value });
      }

      if (action === "plan_limits.update") {
        const supportGate = assertInternalSupportImpl(access.context);
        if (!supportGate.ok) return res.status(supportGate.status).json({ ok: false, error: supportGate.error });
        const value = parsedBody.body?.value;
        if (!value || typeof value !== "object" || Array.isArray(value)) {
          return res.status(400).json({ ok: false, error: "value must be an object" });
        }
        const saved = await upsertAppConfigImpl(supabase, APP_CONFIG_KEYS.planLimits, value);
        await writeAuditLogImpl(supabase, {
          actorUserId: access.context.user.id,
          ownerUserId: null,
          action: "admin.plan_limits.update",
          targetType: "app_config",
          targetId: APP_CONFIG_KEYS.planLimits,
          metadata: value,
        });
        return res.status(200).json({ ok: true, planHooks: saved.value || {} });
      }

      if (action === "jobs.retry" || action === "jobs.replay") {
        const supportGate = assertInternalSupportImpl(access.context);
        if (!supportGate.ok) return res.status(supportGate.status).json({ ok: false, error: supportGate.error });
        const jobId = String(parsedBody.body?.jobId || "");
        if (!jobId) return res.status(400).json({ ok: false, error: "jobId is required" });
        const result = await retryFailedJobImpl(supabase, access.context.user.id, jobId);
        if (!result.ok) return res.status(result.status).json({ ok: false, error: result.error });
        return res.status(200).json({ ok: true, queuedJob: result.queuedJob });
      }

      return res.status(400).json({ ok: false, error: "Unsupported action" });
    } catch (error) {
      captureMonitoringError(error, { endpoint: "/api/admin" });
      return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" });
    }
  };
}

export default createAdminHandler();
