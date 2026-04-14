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
      expires_at: "2026-05-29T00:00:00.000Z",
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

test("exports GET degrades when data_exports is missing", async () => {
  const handler = createExportsHandler({
    getAccessContext: async () => ({
      ok: true,
      context: {
        user: { id: "owner_1" },
        role: "owner",
        supabase: {
          from() {
            return {
              select() {
                return {
                  order() {
                    return this;
                  },
                  limit() {
                    return this;
                  },
                  eq() {
                    return this;
                  },
                  then(resolve) {
                    return Promise.resolve(
                      resolve({
                        data: null,
                        error: { message: "Could not find the table 'public.data_exports' in the schema cache" },
                      })
                    );
                  },
                };
              },
            };
          },
        },
      },
    }),
    resolveOwnerScope: () => "owner_1",
  });

  const req = createMockRequest({ method: "GET" });
  const res = createMockResponse();
  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.ok, true);
  assert.deepEqual(res.body?.history, []);
});

test("exports create returns 503 when data_exports is unavailable", async () => {
  const handler = createExportsHandler({
    getAccessContext: async () => ({
      ok: true,
      context: {
        user: { id: "owner_1" },
        role: "owner",
        supabase: {
          from(table) {
            if (table === "events") {
              return {
                select() {
                  return {
                    eq() {
                      return Promise.resolve({ data: [], error: null });
                    },
                  };
                },
              };
            }
            if (table === "data_exports") {
              return {
                insert() {
                  return {
                    select() {
                      return {
                        async single() {
                          return {
                            data: null,
                            error: { message: "Could not find the table 'public.data_exports' in the schema cache" },
                          };
                        },
                      };
                    },
                  };
                },
              };
            }
            throw new Error(`Unexpected table: ${table}`);
          },
        },
      },
    }),
    resolveOwnerScope: () => "owner_1",
    buildExportDataset: async () => [],
  });

  const req = createMockRequest({
    method: "POST",
    headers: { "content-type": "application/json" },
    body: {
      format: "csv",
      scope: "filtered",
    },
  });
  const res = createMockResponse();
  await handler(req, res);

  assert.equal(res.statusCode, 503);
  assert.equal(res.body?.ok, false);
  assert.match(res.body?.error || "", /Exports unavailable/i);
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
    url: "/api/admin",
    headers: { "content-type": "application/json" },
    body: { action: "jobs.retry", jobId: "job_failed_1", reason: "Replay failed webhook processing" },
  });
  const res = createMockResponse();
  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.ok, true);
  assert.equal(res.body?.queuedJob?.status, "queued");
});

test("admin GET degrades when admin_jobs is missing for internal admin", async () => {
  const handler = createAdminHandler({
    getAccessContext: async () => ({
      ok: true,
      context: {
        user: { id: "support_1" },
        role: "support_internal",
        supabase: {},
      },
    }),
    resolveOwnerScope: () => null,
    getPromoCounter: async () => ({
      claimed: 17,
      cap: 100,
      remaining: 83,
      source: { baselineClaimed: 17, claimedFromData: 0 },
    }),
    listPlanHooks: async () => ({
      plan: "v1",
      limits: { monthly_passes: 10000, support_seats: 2 },
    }),
    listFailedJobs: async () => [],
    listAuditLogs: async () => [],
    listCustomerAccounts: async () => [],
  });

  const req = createMockRequest({ method: "GET", url: "/api/admin" });
  const res = createMockResponse();
  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.ok, true);
  assert.deepEqual(res.body?.failedJobs, []);
  assert.deepEqual(res.body?.customerAccounts, []);
});

test("admin GET returns customer accounts for support tooling", async () => {
  const handler = createAdminHandler({
    getAccessContext: async () => ({
      ok: true,
      context: {
        user: { id: "support_1" },
        role: "support_internal",
        supabase: {},
      },
    }),
    resolveOwnerScope: () => null,
    getPromoCounter: async () => ({
      claimed: 17,
      cap: 100,
      remaining: 83,
      source: { baselineClaimed: 17, claimedFromData: 0 },
    }),
    listPlanHooks: async () => ({ plan: "v1" }),
    listFailedJobs: async () => [],
    listAuditLogs: async () => [],
    listCustomerAccounts: async () => ([{
      id: "acct_1",
      owner_user_id: "owner_1",
      slug: "acme",
      name: "Acme",
      billing_state: "active",
      enforcement_enabled: true,
      hard_block_issuance: false,
      monthly_included_issuances: 20000,
      created_at: "2026-02-27T12:00:00.000Z",
      updated_at: "2026-02-27T12:00:00.000Z",
      is_paid: true,
      subscription: {
        provider: "square",
        provider_customer_id: "cust_1",
        plan_code: "core_v1",
        status: "active",
        current_period_start: "2026-02-01T00:00:00.000Z",
        current_period_end: "2026-03-01T00:00:00.000Z",
      },
      usage: {
        usage_month: "2026-02-01",
        issuances_count: 42,
        overage_count: 0,
        blocked_count: 0,
        last_issued_at: "2026-02-27T12:00:00.000Z",
      },
    }]),
  });

  const req = createMockRequest({ method: "GET", url: "/api/admin/accounts" });
  const res = createMockResponse();
  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.ok, true);
  assert.equal(res.body?.accounts?.[0]?.slug, "acme");
  assert.equal(res.body?.accounts?.[0]?.is_paid, true);
});

test("admin updates customer account service settings", async () => {
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
    updateCustomerAccountService: async (_supabase, actorUserId, _actorRole, body) => ({
      ok: true,
      status: 200,
      account: {
        id: body.accountId,
        owner_user_id: "owner_1",
        billing_state: body.billingState,
        monthly_included_issuances: body.monthlyIncludedIssuances,
        enforcement_enabled: body.enforcementEnabled,
        hard_block_issuance: body.hardBlockIssuance,
        actorUserId,
      },
    }),
  });

  const req = createMockRequest({
    method: "POST",
    url: "/api/admin",
    headers: { "content-type": "application/json" },
    body: {
      action: "account.service.update",
      accountId: "acct_1",
      billingState: "active",
      monthlyIncludedIssuances: 50000,
      enforcementEnabled: true,
      hardBlockIssuance: false,
      reason: "Activate paid customer account",
    },
  });
  const res = createMockResponse();
  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.ok, true);
  assert.equal(res.body?.account?.billing_state, "active");
  assert.equal(res.body?.account?.monthly_included_issuances, 50000);
});

test("admin returns 503 for retry when admin_jobs is unavailable", async () => {
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
      ok: false,
      status: 503,
      error: "Admin jobs unavailable until the latest schema patch is applied",
    }),
  });

  const req = createMockRequest({
    method: "POST",
    url: "/api/admin",
    headers: { "content-type": "application/json" },
    body: { action: "jobs.retry", jobId: "job_failed_1", reason: "Schema patch check" },
  });
  const res = createMockResponse();
  await handler(req, res);

  assert.equal(res.statusCode, 503);
  assert.equal(res.body?.ok, false);
  assert.match(res.body?.error || "", /Admin jobs unavailable/i);
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
