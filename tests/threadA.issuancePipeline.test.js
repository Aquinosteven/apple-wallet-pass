import test from "node:test";
import assert from "node:assert/strict";
import {
  buildIssuanceDedupeKey,
  getRetryDelayMs,
  processIssuanceRequest,
} from "../lib/threadA/issuancePipeline.js";

function createSupabaseMock() {
  const state = {
    issuanceUpdates: [],
    webhookUpdates: [],
    deadLetters: [],
  };

  return {
    state,
    from(table) {
      if (table === "issuance_requests") {
        return {
          update(payload) {
            return {
              eq() {
                return {
                  select() {
                    return {
                      async single() {
                        state.issuanceUpdates.push(payload);
                        return {
                          data: {
                            id: "iss_1",
                            status: payload.status,
                            retries: payload.retries || 0,
                            max_retries: 3,
                            claim_token: payload.claim_token || null,
                            pass_id: payload.pass_id || null,
                            failure_reason: payload.failure_reason || null,
                            next_retry_at: payload.next_retry_at || null,
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
      }

      if (table === "webhook_events") {
        return {
          update(payload) {
            return {
              async eq() {
                state.webhookUpdates.push(payload);
                return { data: null, error: null };
              },
            };
          },
        };
      }

      if (table === "webhook_dead_letter") {
        return {
          async insert(payload) {
            state.deadLetters.push(payload);
            return { data: payload, error: null };
          },
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
  };
}

test("buildIssuanceDedupeKey prefers crm contact id when present", () => {
  const withCrm = buildIssuanceDedupeKey({
    accountId: "acct_1",
    eventId: "evt_1",
    crmContactId: "crm_99",
    email: "one@example.com",
  });
  const withSameCrmDifferentEmail = buildIssuanceDedupeKey({
    accountId: "acct_1",
    eventId: "evt_1",
    crmContactId: "crm_99",
    email: "two@example.com",
  });

  assert.equal(withCrm, withSameCrmDifferentEmail);
});

test("getRetryDelayMs uses retry-then-fail cadence", () => {
  assert.equal(getRetryDelayMs(0), 2000);
  assert.equal(getRetryDelayMs(1), 5000);
  assert.equal(getRetryDelayMs(2), 15000);
  assert.equal(getRetryDelayMs(9), 15000);
});

test("processIssuanceRequest marks success when claim issuance succeeds", async () => {
  const supabase = createSupabaseMock();

  const result = await processIssuanceRequest(supabase, {
    id: "iss_1",
    account_id: "acct_1",
    event_id: "evt_1",
    webhook_event_id: "wh_1",
    email: "casey@example.com",
    name: "Casey",
    phone: "+15551234567",
    crm_contact_id: "crm_1",
    join_link: "https://zoom.us/j/1",
    tier: "GA",
    retries: 0,
    max_retries: 3,
  }, {
    issueClaim: async () => ({
      eventId: "evt_1",
      registrantId: "reg_1",
      passId: "pass_1",
      claimToken: "a".repeat(64),
    }),
  });

  assert.equal(result.ok, true);
  assert.equal(result.request.status, "completed");
  assert.equal(supabase.state.deadLetters.length, 0);
});

test("processIssuanceRequest retries on transient failure then does not dead-letter yet", async () => {
  const supabase = createSupabaseMock();

  const result = await processIssuanceRequest(supabase, {
    id: "iss_1",
    account_id: "acct_1",
    event_id: "evt_1",
    webhook_event_id: "wh_1",
    email: "casey@example.com",
    name: "Casey",
    phone: "+15551234567",
    crm_contact_id: "crm_1",
    join_link: "https://zoom.us/j/1",
    tier: "GA",
    retries: 0,
    max_retries: 3,
  }, {
    issueClaim: async () => {
      throw new Error("temporary db issue");
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.retrying, true);
  assert.equal(result.request.status, "retrying");
  assert.equal(supabase.state.deadLetters.length, 0);
});
