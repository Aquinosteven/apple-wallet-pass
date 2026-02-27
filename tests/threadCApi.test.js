import test from "node:test";
import assert from "node:assert/strict";
import { createDashboardMetricsHandler } from "../api/dashboard-metrics.js";
import { createExportsHandler } from "../api/exports.js";
import { createAdminHandler } from "../api/admin.js";
import { createSupportHandler } from "../api/support.js";

function createMockResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    sentBuffer: null,
    ended: false,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    send(payload) {
      this.sentBuffer = payload;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
  };
}

function createMockRequest(options = {}) {
  return {
    method: options.method || "GET",
    headers: options.headers || {},
    query: options.query || {},
    body: options.body,
    url: options.url || "/api/test",
    async *[Symbol.asyncIterator]() {
      if (options.rawBody) yield Buffer.from(options.rawBody);
    },
  };
}

function createDataExportsSupabaseMock({ forDownloadRow } = {}) {
  const state = {
    created: [],
  };

  function createHistoryQuery(rows) {
    return {
      _ownerUserId: null,
      _id: null,
      _limit: 100,
      order() {
        return this;
      },
      limit(value) {
        this._limit = value;
        return this;
      },
      eq(column, value) {
        if (column === "owner_user_id") this._ownerUserId = value;
        if (column === "id") this._id = value;
        return this;
      },
      async maybeSingle() {
        const source = forDownloadRow || rows.find((item) => item.id === this._id) || null;
        if (!source) return { data: null, error: null };
        if (this._ownerUserId && source.owner_user_id !== this._ownerUserId) return { data: null, error: null };
        return { data: source, error: null };
      },
      then(resolve) {
        const filtered = rows.filter((item) => !this._ownerUserId || item.owner_user_id === this._ownerUserId);
        return Promise.resolve(resolve({ data: filtered.slice(0, this._limit), error: null }));
      },
    };
  }

  return {
    state,
    from(table) {
      if (table !== "data_exports") throw new Error(`Unexpected table: ${table}`);
      return {
        select() {
          return createHistoryQuery(state.created);
        },
        insert(payload) {
          state.created.push({
            id: `exp_${state.created.length + 1}`,
            owner_user_id: payload.owner_user_id,
            format: payload.format,
            scope: payload.scope,
            filters: payload.filters,
            dataset: payload.dataset,
            row_count: payload.row_count,
            status: "ready",
            created_at: "2026-02-27T12:00:00.000Z",
            expires_at: "2026-03-29T12:00:00.000Z",
          });
          return {
            select() {
              return {
                async single() {
                  return { data: state.created[state.created.length - 1], error: null };
                },
              };
            },
          };
        },
      };
    },
  };
}

test("dashboard metrics defaults to 7-day window and returns totals", async () => {
  const handler = createDashboardMetricsHandler({
    getAccessContext: async () => ({
      ok: true,
      context: {
        user: { id: "owner_1" },
        role: "owner",
        supabase: {},
      },
    }),
    resolveOwnerScope: () => "owner_1",
    collectMetrics: async () => ({
      range: { start: "2026-02-21T00:00:00.000Z", end: "2026-02-27T23:59:59.999Z", defaultWindow: "last_7_days" },
      totals: { passesIssued: 12, walletAdds: 7, reminderSends: 3 },
      series: [],
    }),
  });

  const req = createMockRequest({ method: "GET", query: {} });
  const res = createMockResponse();
  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.ok, true);
  assert.equal(res.body?.totals?.passesIssued, 12);
  assert.equal(res.body?.range?.defaultWindow, "last_7_days");
});

test("exports creates history row and supports filtered/full toggle", async () => {
  const supabase = createDataExportsSupabaseMock();
  const handler = createExportsHandler({
    getAccessContext: async () => ({
      ok: true,
      context: {
        user: { id: "owner_1" },
        role: "owner",
        supabase,
      },
    }),
    resolveOwnerScope: () => "owner_1",
    buildExportDataset: async () => [{ pass_id: "p_1", status: "active" }],
    writeAuditLog: async () => ({ ok: true }),
  });

  const req = createMockRequest({
    method: "POST",
    headers: { "content-type": "application/json" },
    body: {
      format: "csv",
      scope: "filtered",
      filters: { start: "2026-02-20", end: "2026-02-27" },
    },
  });
  const res = createMockResponse();
  await handler(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body?.ok, true);
  assert.equal(res.body?.export?.scope, "filtered");
  assert.equal(res.body?.export?.rowCount, 1);
});

test("exports download returns 410 for expired export", async () => {
  const supabase = createDataExportsSupabaseMock({
    forDownloadRow: {
      id: "exp_old",
      owner_user_id: "owner_1",
      format: "csv",
      scope: "full",
      dataset: [{ pass_id: "p_1" }],
      status: "ready",
      created_at: "2026-01-01T00:00:00.000Z",
      expires_at: "2026-01-15T00:00:00.000Z",
    },
  });
  const handler = createExportsHandler({
    getAccessContext: async () => ({
      ok: true,
      context: {
        user: { id: "owner_1" },
        role: "owner",
        supabase,
      },
    }),
    resolveOwnerScope: () => "owner_1",
    writeAuditLog: async () => ({ ok: true }),
  });

  const req = createMockRequest({ method: "GET", query: { downloadId: "exp_old" } });
  const res = createMockResponse();
  await handler(req, res);

  assert.equal(res.statusCode, 410);
  assert.equal(res.body?.ok, false);
});

test("exports download serves spreadsheet XML with matching mime and extension", async () => {
  const supabase = createDataExportsSupabaseMock({
    forDownloadRow: {
      id: "exp_xml",
      owner_user_id: "owner_1",
      format: "xlsx",
      scope: "full",
      dataset: [{ pass_id: "p_1", status: "active" }],
      status: "ready",
      created_at: "2026-02-27T00:00:00.000Z",
      expires_at: "2026-03-29T00:00:00.000Z",
    },
  });
  const handler = createExportsHandler({
    getAccessContext: async () => ({
      ok: true,
      context: {
        user: { id: "owner_1" },
        role: "owner",
        supabase,
      },
    }),
    resolveOwnerScope: () => "owner_1",
    writeAuditLog: async () => ({ ok: true }),
  });

  const req = createMockRequest({ method: "GET", query: { downloadId: "exp_xml" } });
  const res = createMockResponse();
  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["Content-Type"], "application/xml; charset=utf-8");
  assert.equal(
    res.headers["Content-Disposition"],
    'attachment; filename="showfi-export-exp_xml.xml"'
  );
});

test("admin blocks internal-only actions for owner role", async () => {
  const handler = createAdminHandler({
    getAccessContext: async () => ({
      ok: true,
      context: {
        user: { id: "owner_1" },
        role: "owner",
        supabase: {},
      },
    }),
    assertInternalSupport: () => ({ ok: false, status: 403, error: "Internal support role required" }),
  });

  const req = createMockRequest({
    method: "POST",
    headers: { "content-type": "application/json" },
    body: { action: "promo.override", claimed: 50 },
  });
  const res = createMockResponse();
  await handler(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body?.ok, false);
});

test("admin retries failed jobs", async () => {
  const handler = createAdminHandler({
    getAccessContext: async () => ({
      ok: true,
      context: {
        user: { id: "support_1" },
        role: "support_internal",
        supabase: {},
      },
    }),
    assertInternalSupport: () => ({ ok: true }),
    retryFailedJob: async () => ({
      ok: true,
      status: 200,
      queuedJob: { id: "job_new_1", status: "queued" },
    }),
  });

  const req = createMockRequest({
    method: "POST",
    headers: { "content-type": "application/json" },
    body: { action: "jobs.retry", jobId: "job_failed_1" },
  });
  const res = createMockResponse();
  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.ok, true);
  assert.equal(res.body?.queuedJob?.status, "queued");
});

test("support creates ticket and invokes mail abstraction", async () => {
  const calls = [];
  const supabase = {
    from(table) {
      if (table !== "support_tickets") throw new Error(`Unexpected table: ${table}`);
      return {
        insert(payload) {
          calls.push(payload);
          return {
            select() {
              return {
                async single() {
                  return {
                    data: {
                      id: "ticket_1",
                      owner_user_id: payload.owner_user_id,
                      requester_name: payload.requester_name,
                      requester_email: payload.requester_email,
                      subject: payload.subject,
                      message: payload.message,
                      status: "open",
                      metadata: payload.metadata,
                      created_at: "2026-02-27T12:00:00.000Z",
                    },
                    error: null,
                  };
                },
              };
            },
          };
        },
      };
    },
  };

  const handler = createSupportHandler({
    getAccessContext: async () => ({
      ok: true,
      context: {
        user: { id: "owner_1" },
        role: "owner",
        supabase,
      },
    }),
    resolveOwnerScope: () => "owner_1",
    sendSupportEmail: async () => ({ ok: true, provider: "log" }),
    writeAuditLog: async () => ({ ok: true }),
  });

  const req = createMockRequest({
    method: "POST",
    headers: { "content-type": "application/json" },
    body: {
      requesterName: "Casey",
      requesterEmail: "casey@example.com",
      subject: "Need help",
      message: "Webhook failed",
    },
  });
  const res = createMockResponse();
  await handler(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body?.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].requester_email, "casey@example.com");
});
