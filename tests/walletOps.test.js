import test from "node:test";
import assert from "node:assert/strict";
import {
  buildApplePassUpdateSignal,
  buildCancellationRevocations,
  buildGoogleUpdatePlan,
  buildReissuePolicyDecision,
  buildReminderSchedules,
  canEditReminder,
  MAX_REMINDERS_PER_EVENT,
  mergeJoinClickMetrics,
  planReminderRetry,
} from "../lib/walletOps.js";

test("apple pass update signal deduplicates active push tokens", () => {
  const signal = buildApplePassUpdateSignal({
    passTypeIdentifier: "pass.type.id",
    serialNumber: "serial-1",
    registrations: [
      {
        device_library_id: "dev-1",
        pass_type_identifier: "pass.type.id",
        serial_number: "serial-1",
        push_token: "push-a",
        active: true,
      },
      {
        device_library_id: "dev-2",
        pass_type_identifier: "pass.type.id",
        serial_number: "serial-1",
        push_token: "push-a",
        active: true,
      },
      {
        device_library_id: "dev-3",
        pass_type_identifier: "pass.type.id",
        serial_number: "serial-2",
        push_token: "push-b",
        active: true,
      },
    ],
  });

  assert.equal(signal.signalCount, 1);
  assert.equal(signal.targets[0].pushToken, "push-a");
});

test("google update plan returns retry before max attempts", () => {
  const plan = buildGoogleUpdatePlan({
    attemptCount: 1,
    maxAttempts: 4,
    passId: "pass_1",
    reissueBaseUrl: "https://example.com",
    now: "2026-02-27T00:00:00.000Z",
  });

  assert.equal(plan.action, "retry_update");
  assert.equal(plan.status, "retrying");
  assert.equal(typeof plan.retryAt, "string");
});

test("google update plan falls back to reissue link after repeated failures", () => {
  const plan = buildGoogleUpdatePlan({
    attemptCount: 2,
    maxAttempts: 3,
    passId: "pass_2",
    reissueBaseUrl: "https://showfi.io",
  });

  assert.equal(plan.action, "reissue_link_fallback");
  assert.equal(plan.status, "failed");
  assert.equal(plan.fallbackUrl, "https://showfi.io/claim/reissue/pass_2");
});

test("reissue decision revokes old pass by default", () => {
  const decision = buildReissuePolicyDecision({
    oldPassId: "old_1",
    newPassId: "new_1",
    supportsReplacementState: true,
  });

  assert.equal(decision.policy, "revoke_old");
  assert.equal(decision.oldPassPatch?.status, "revoked");
  assert.equal(decision.newPassPatch.replacement_state, "replacement");
});

test("reissue decision keeps old pass when keep_old policy is set", () => {
  const decision = buildReissuePolicyDecision({
    policy: "keep_old",
    oldPassId: "old_2",
    newPassId: "new_2",
  });

  assert.equal(decision.oldPassPatch, null);
  assert.equal(decision.newPassPatch.replacement_of_pass_id, "old_2");
});

test("cancellation policy immediately revokes all passes", () => {
  const revocations = buildCancellationRevocations({
    policy: "immediate_revoke_all",
    passIds: ["p1", "p2", "p3"],
  });

  assert.equal(revocations.length, 3);
  assert.equal(revocations[0].status, "revoked");
  assert.equal(revocations[1].revoked_reason, "event_canceled");
});

test("reminder schedules enforce maximum of three reminders", () => {
  assert.throws(
    () => buildReminderSchedules({
      eventStartsAt: "2026-03-01T15:00:00.000Z",
      reminders: Array.from({ length: MAX_REMINDERS_PER_EVENT + 1 }, (_, idx) => ({
        kind: "fixed_datetime",
        sendAt: `2026-02-2${idx}T15:00:00.000Z`,
      })),
    }),
    /at most 3 reminders/
  );
});

test("canEditReminder blocks edits at or after run time", () => {
  assert.equal(
    canEditReminder({
      runAt: "2026-02-27T12:00:00.000Z",
      now: "2026-02-27T11:59:59.000Z",
    }),
    true
  );
  assert.equal(
    canEditReminder({
      runAt: "2026-02-27T12:00:00.000Z",
      now: "2026-02-27T12:00:00.000Z",
    }),
    false
  );
});

test("reminder retry plans enqueue dead letter after max attempts", () => {
  const plan = planReminderRetry({
    jobId: "job_123",
    eventId: "event_123",
    payload: { channel: "email" },
    attemptCount: 2,
    maxAttempts: 3,
    error: "smtp timeout",
  });

  assert.equal(plan.status, "dead_letter");
  assert.equal(plan.deadLetter?.queue_kind, "reminder");
  assert.equal(plan.deadLetter?.source_job_id, "job_123");
});

test("join metrics preserve first click and increment count", () => {
  const first = mergeJoinClickMetrics({}, "2026-02-27T01:00:00.000Z");
  assert.equal(first.first_at, "2026-02-27T01:00:00.000Z");
  assert.equal(first.latest_at, "2026-02-27T01:00:00.000Z");
  assert.equal(first.count, 1);

  const second = mergeJoinClickMetrics(first, "2026-02-27T02:00:00.000Z");
  assert.equal(second.first_at, "2026-02-27T01:00:00.000Z");
  assert.equal(second.latest_at, "2026-02-27T02:00:00.000Z");
  assert.equal(second.count, 2);
});
