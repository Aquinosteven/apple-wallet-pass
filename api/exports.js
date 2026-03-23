import { setJsonCors } from "../lib/apiAuth.js";
import { readJsonBodyStrict } from "../lib/requestValidation.js";
import { getAccessContext, resolveOwnerScope } from "../lib/threadCAccess.js";
import { buildCsvBuffer, buildSpreadsheetXmlBuffer } from "../lib/exportFormatter.js";
import { writeAuditLog } from "../lib/auditLog.js";
import { captureMonitoringError } from "../lib/monitoring.js";

function isMissingRelationError(error) {
  const message = String(error?.message || "").toLowerCase();
  const details = String(error?.details || "").toLowerCase();
  return message.includes("does not exist")
    || message.includes("could not find the table")
    || details.includes("does not exist");
}

function normalizeFormat(value) {
  const format = String(value || "csv").trim().toLowerCase();
  return format === "xlsx" ? "xlsx" : "csv";
}

function normalizeScope(value) {
  const scope = String(value || "filtered").trim().toLowerCase();
  return scope === "full" ? "full" : "filtered";
}

function parseDateInput(value) {
  if (!value) return null;
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function buildFilters(input) {
  const src = input && typeof input === "object" ? input : {};
  const start = parseDateInput(src.start);
  const end = parseDateInput(src.end);
  return {
    start,
    end,
    eventId: src.eventId ? String(src.eventId) : null,
  };
}

async function lookupOwnerEventIds(supabase, ownerUserId) {
  if (!ownerUserId) return null;
  const { data, error } = await supabase.from("events").select("id,name").eq("user_id", ownerUserId);
  if (error) throw new Error(error.message || "Failed to load owner events");
  return data || [];
}

async function buildExportDataset({ supabase, ownerUserId, scope, filters }) {
  const ownerEvents = await lookupOwnerEventIds(supabase, ownerUserId);
  const ownerEventIds = ownerEvents ? ownerEvents.map((event) => event.id) : null;
  const eventNameById = new Map((ownerEvents || []).map((event) => [event.id, event.name]));

  let passQuery = supabase
    .from("passes")
    .select("id,event_id,registrant_id,claim_token,claimed_at,status,created_at")
    .order("created_at", { ascending: false });

  if (Array.isArray(ownerEventIds)) {
    if (!ownerEventIds.length) return [];
    passQuery = passQuery.in("event_id", ownerEventIds);
  }
  if (scope === "filtered") {
    if (filters.start) passQuery = passQuery.gte("created_at", filters.start);
    if (filters.end) passQuery = passQuery.lte("created_at", filters.end);
    if (filters.eventId) passQuery = passQuery.eq("event_id", filters.eventId);
  }

  const { data: passRows, error: passError } = await passQuery;
  if (passError) throw new Error(passError.message || "Failed to load pass rows");
  if (!(passRows || []).length) return [];

  const registrantIds = [...new Set(passRows.map((row) => row.registrant_id).filter(Boolean))];
  let registrantsById = new Map();
  if (registrantIds.length) {
    const { data: registrants, error: regError } = await supabase
      .from("registrants")
      .select("id,name,email")
      .in("id", registrantIds);
    if (regError) throw new Error(regError.message || "Failed to load registrants");
    registrantsById = new Map((registrants || []).map((row) => [row.id, row]));
  }

  return passRows.map((row) => {
    const registrant = registrantsById.get(row.registrant_id) || {};
    return {
      pass_id: row.id,
      event_id: row.event_id,
      event_name: eventNameById.get(row.event_id) || "",
      registrant_name: registrant.name || "",
      registrant_email: registrant.email || "",
      claim_token: row.claim_token || "",
      status: row.status || "",
      claimed_at: row.claimed_at || "",
      issued_at: row.created_at || "",
    };
  });
}

function toHistoryRow(row) {
  const now = Date.now();
  const expiresAtMs = new Date(row.expires_at).getTime();
  return {
    id: row.id,
    format: row.format,
    scope: row.scope,
    filters: row.filters || {},
    rowCount: row.row_count,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    status: expiresAtMs < now ? "expired" : row.status,
  };
}

function asDownloadPayload(exportRow) {
  const rows = Array.isArray(exportRow.dataset) ? exportRow.dataset : [];
  const format = normalizeFormat(exportRow.format);
  const isSpreadsheetXml = format === "xlsx";
  const buffer = isSpreadsheetXml ? buildSpreadsheetXmlBuffer(rows) : buildCsvBuffer(rows);
  const extension = isSpreadsheetXml ? "xml" : "csv";
  const contentType = isSpreadsheetXml
    ? "application/xml; charset=utf-8"
    : "text/csv; charset=utf-8";
  return {
    contentType,
    filename: `showfi-export-${exportRow.id}.${extension}`,
    buffer,
  };
}

export function createExportsHandler(deps = {}) {
  const getAccessContextImpl = deps.getAccessContext || getAccessContext;
  const resolveOwnerScopeImpl = deps.resolveOwnerScope || resolveOwnerScope;
  const writeAuditLogImpl = deps.writeAuditLog || writeAuditLog;
  const buildExportDatasetImpl = deps.buildExportDataset || buildExportDataset;

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

      if (req.method === "GET") {
        const exportId = req.query?.downloadId ? String(req.query.downloadId) : "";
        const ownerUserId = resolveOwnerScopeImpl(access.context, req.query?.ownerUserId);
        let historyQuery = supabase
          .from("data_exports")
          .select("id,owner_user_id,format,scope,filters,dataset,row_count,status,created_at,expires_at")
          .order("created_at", { ascending: false })
          .limit(100);
        if (ownerUserId) historyQuery = historyQuery.eq("owner_user_id", ownerUserId);

        if (!exportId) {
          const { data, error } = await historyQuery;
          if (error) {
            if (isMissingRelationError(error)) {
              return res.status(200).json({ ok: true, history: [] });
            }
            return res.status(500).json({ ok: false, error: error.message });
          }
          return res.status(200).json({ ok: true, history: (data || []).map(toHistoryRow) });
        }

        let downloadQuery = supabase
          .from("data_exports")
          .select("id,owner_user_id,format,scope,dataset,created_at,expires_at,status")
          .eq("id", exportId)
          .limit(1);
        if (ownerUserId) downloadQuery = downloadQuery.eq("owner_user_id", ownerUserId);
        const { data: row, error } = await downloadQuery.maybeSingle();
        if (error) {
          if (isMissingRelationError(error)) {
            return res.status(503).json({ ok: false, error: "Exports unavailable until the latest schema patch is applied" });
          }
          return res.status(500).json({ ok: false, error: error.message });
        }
        if (!row) return res.status(404).json({ ok: false, error: "Export not found" });
        if (new Date(row.expires_at).getTime() < Date.now()) {
          return res.status(410).json({ ok: false, error: "Export expired (30-day retention)" });
        }

        const file = asDownloadPayload(row);
        await writeAuditLogImpl(supabase, {
          actorUserId: access.context.user.id,
          ownerUserId: row.owner_user_id,
          action: "export.download",
          targetType: "data_export",
          targetId: row.id,
          metadata: { format: row.format, scope: row.scope },
        });

        res.setHeader("Content-Type", file.contentType);
        res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
        return res.status(200).send(file.buffer);
      }

      const parsedBody = await readJsonBodyStrict(req);
      if (!parsedBody.ok) return res.status(parsedBody.status).json({ ok: false, error: parsedBody.error });
      const format = normalizeFormat(parsedBody.body?.format);
      const scope = normalizeScope(parsedBody.body?.scope);
      const ownerUserId = resolveOwnerScopeImpl(access.context, parsedBody.body?.ownerUserId);
      const filters = buildFilters(parsedBody.body?.filters);

      const dataset = await buildExportDatasetImpl({
        supabase,
        ownerUserId,
        scope,
        filters,
      });

      const insertPayload = {
        owner_user_id: ownerUserId || access.context.user.id,
        actor_user_id: access.context.user.id,
        format,
        scope,
        filters,
        dataset,
        row_count: dataset.length,
      };
      const { data: created, error: createError } = await supabase
        .from("data_exports")
        .insert(insertPayload)
        .select("id,owner_user_id,format,scope,row_count,status,created_at,expires_at")
        .single();
      if (createError) {
        if (isMissingRelationError(createError)) {
          return res.status(503).json({ ok: false, error: "Exports unavailable until the latest schema patch is applied" });
        }
        return res.status(500).json({ ok: false, error: createError.message });
      }

      await writeAuditLogImpl(supabase, {
        actorUserId: access.context.user.id,
        ownerUserId: insertPayload.owner_user_id,
        action: "export.create",
        targetType: "data_export",
        targetId: created.id,
        metadata: { format, scope, rowCount: dataset.length },
      });

      return res.status(201).json({
        ok: true,
        export: toHistoryRow({
          ...created,
          filters,
        }),
      });
    } catch (error) {
      captureMonitoringError(error, { endpoint: "/api/exports" });
      return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" });
    }
  };
}

export default createExportsHandler();
