const MAX_REMINDERS_PER_EVENT = 3;
const DEFAULT_RETRY_BASE_MS = 60_000;
const DEFAULT_RETRY_MAX_MS = 30 * 60_000;
const DEFAULT_MAX_ATTEMPTS = 3;

function toIso(input, fallback = new Date().toISOString()) {
  const parsed = new Date(input || fallback);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toISOString();
}

function clampPositiveInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function normalizeText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeOffsetMinutes(value) {
  const offset = Number(value);
  if (!Number.isFinite(offset) || offset <= 0) return null;
  return Math.floor(offset);
}

function computeBackoffMs({ attempt, baseMs = DEFAULT_RETRY_BASE_MS, maxMs = DEFAULT_RETRY_MAX_MS }) {
  const safeAttempt = clampPositiveInt(attempt, 1);
  const safeBase = clampPositiveInt(baseMs, DEFAULT_RETRY_BASE_MS);
  const safeMax = clampPositiveInt(maxMs, DEFAULT_RETRY_MAX_MS);
  return Math.min(safeMax, safeBase * (2 ** (safeAttempt - 1)));
}

export function buildAppleRegistrationUpsert(input = {}) {
  const nowIso = toIso(input.now);
  return {
    device_library_id: normalizeText(input.deviceLibraryId),
    pass_type_identifier: normalizeText(input.passTypeIdentifier),
    serial_number: normalizeText(input.serialNumber),
    push_token: normalizeText(input.pushToken),
    active: true,
    registered_at: nowIso,
    last_seen_at: nowIso,
  };
}

export function buildAppleUnregisterPatch(input = {}) {
  return {
    active: false,
    last_seen_at: toIso(input.now),
  };
}

export function buildApplePassUpdateSignal(input = {}) {
  const passTypeIdentifier = normalizeText(input.passTypeIdentifier);
  const serialNumber = normalizeText(input.serialNumber);
  const registrations = Array.isArray(input.registrations) ? input.registrations : [];
  const seen = new Set();
  const targets = [];

  for (const registration of registrations) {
    if (!registration || registration.active === false) continue;
    if (normalizeText(registration.pass_type_identifier) !== passTypeIdentifier) continue;
    if (normalizeText(registration.serial_number) !== serialNumber) continue;
    const token = normalizeText(registration.push_token);
    if (!token || seen.has(token)) continue;
    seen.add(token);
    targets.push({
      deviceLibraryId: normalizeText(registration.device_library_id),
      pushToken: token,
      serialNumber,
      passTypeIdentifier,
    });
  }

  return {
    targets,
    signalCount: targets.length,
    updateTag: `apple:${passTypeIdentifier}:${serialNumber}:${Date.now()}`,
  };
}

export function buildGoogleUpdatePlan(input = {}) {
  const nowIso = toIso(input.now);
  const maxAttempts = clampPositiveInt(input.maxAttempts, DEFAULT_MAX_ATTEMPTS);
  const nextAttempt = clampPositiveInt(input.attemptCount, 0) + 1;
  const passId = normalizeText(input.passId);
  const baseReissueUrl = normalizeText(input.reissueBaseUrl || "");
  const fallbackPath = passId ? `/claim/reissue/${encodeURIComponent(passId)}` : "/claim/reissue";
  const fallbackUrl = baseReissueUrl
    ? `${baseReissueUrl.replace(/\/$/, "")}${fallbackPath}`
    : fallbackPath;

  if (nextAttempt >= maxAttempts) {
    return {
      action: "reissue_link_fallback",
      attemptCount: nextAttempt,
      status: "failed",
      fallbackUrl,
      failedAt: nowIso,
      retryAt: null,
    };
  }

  const delayMs = computeBackoffMs({
    attempt: nextAttempt,
    baseMs: input.baseDelayMs,
    maxMs: input.maxDelayMs,
  });
  return {
    action: "retry_update",
    attemptCount: nextAttempt,
    status: "retrying",
    fallbackUrl: null,
    failedAt: nowIso,
    retryAt: new Date(new Date(nowIso).getTime() + delayMs).toISOString(),
    delayMs,
  };
}

export function buildReissuePolicyDecision(input = {}) {
  const policy = normalizeText(input.policy || "revoke_old");
  const nowIso = toIso(input.now);
  const oldPassId = normalizeText(input.oldPassId);
  const newPassId = normalizeText(input.newPassId);
  const supportsReplacementState = Boolean(input.supportsReplacementState);

  const decision = {
    policy,
    oldPassPatch: null,
    newPassPatch: {
      replacement_of_pass_id: oldPassId || null,
      replacement_state: null,
    },
  };

  if (policy === "keep_old") {
    return decision;
  }

  decision.oldPassPatch = {
    status: "revoked",
    revoked_at: nowIso,
    revoked_reason: "reissued",
    replaced_by_pass_id: newPassId || null,
  };
  if (supportsReplacementState) {
    decision.newPassPatch.replacement_state = "replacement";
  }
  return decision;
}

export function buildCancellationRevocations(input = {}) {
  const policy = normalizeText(input.policy || "immediate_revoke_all");
  const nowIso = toIso(input.now);
  const passIds = Array.isArray(input.passIds) ? input.passIds : [];
  if (policy !== "immediate_revoke_all") return [];

  return passIds
    .map((id) => normalizeText(id))
    .filter(Boolean)
    .map((passId) => ({
      id: passId,
      status: "revoked",
      revoked_at: nowIso,
      revoked_reason: "event_canceled",
      replacement_state: "revoked",
    }));
}

function getReminderRunAt(definition, eventStartsAtIso) {
  const kind = normalizeText(definition?.kind || "");
  if (kind === "fixed_datetime") {
    const runAt = toIso(definition.sendAt || "");
    return runAt;
  }
  if (kind === "relative_offset") {
    const offsetMinutes = normalizeOffsetMinutes(definition.offsetMinutes);
    if (!offsetMinutes) {
      throw new Error("relative_offset reminder requires positive offsetMinutes");
    }
    const eventDate = new Date(eventStartsAtIso || "");
    if (Number.isNaN(eventDate.getTime())) {
      throw new Error("relative_offset reminder requires valid eventStartsAt");
    }
    return new Date(eventDate.getTime() - (offsetMinutes * 60 * 1000)).toISOString();
  }
  throw new Error("Reminder kind must be fixed_datetime or relative_offset");
}

export function buildReminderSchedules(input = {}) {
  const reminders = Array.isArray(input.reminders) ? input.reminders : [];
  if (reminders.length > MAX_REMINDERS_PER_EVENT) {
    throw new Error(`v1 allows at most ${MAX_REMINDERS_PER_EVENT} reminders per event`);
  }

  const eventStartsAt = normalizeText(input.eventStartsAt);
  const nowIso = toIso(input.now);
  return reminders.map((definition, index) => {
    const kind = normalizeText(definition.kind);
    const offsetMinutes = kind === "relative_offset"
      ? normalizeOffsetMinutes(definition.offsetMinutes)
      : null;
    const runAt = getReminderRunAt(definition, eventStartsAt);
    return {
      ordinal: index + 1,
      kind,
      run_at: runAt,
      send_at: kind === "fixed_datetime" ? runAt : null,
      offset_minutes: offsetMinutes,
      paused: Boolean(definition.paused),
      latest_editable_at: runAt,
      created_at: nowIso,
      updated_at: nowIso,
    };
  });
}

export function applyReminderPauseState(input = {}) {
  return {
    paused: Boolean(input.paused),
    updated_at: toIso(input.now),
  };
}

export function canEditReminder(input = {}) {
  const runAt = new Date(input.runAt || "");
  if (Number.isNaN(runAt.getTime())) return false;
  const now = new Date(input.now || new Date().toISOString());
  if (Number.isNaN(now.getTime())) return false;
  return now.getTime() < runAt.getTime();
}

export function planReminderRetry(input = {}) {
  const nowIso = toIso(input.now);
  const currentAttempt = clampPositiveInt(input.attemptCount, 0);
  const maxAttempts = clampPositiveInt(input.maxAttempts, DEFAULT_MAX_ATTEMPTS);
  const nextAttempt = currentAttempt + 1;
  const error = normalizeText(input.error || "reminder_delivery_failed");

  if (nextAttempt >= maxAttempts) {
    return {
      status: "dead_letter",
      attempt_count: nextAttempt,
      retry_at: null,
      deadLetter: buildDeadLetterEntry({
        kind: "reminder",
        sourceJobId: input.jobId,
        eventId: input.eventId,
        passId: input.passId,
        error,
        payload: input.payload || {},
        now: nowIso,
      }),
    };
  }

  const delayMs = computeBackoffMs({
    attempt: nextAttempt,
    baseMs: input.baseDelayMs,
    maxMs: input.maxDelayMs,
  });
  return {
    status: "retrying",
    attempt_count: nextAttempt,
    retry_at: new Date(new Date(nowIso).getTime() + delayMs).toISOString(),
    delayMs,
    deadLetter: null,
  };
}

export function buildDeadLetterEntry(input = {}) {
  return {
    queue_kind: normalizeText(input.kind || "unknown"),
    source_job_id: normalizeText(input.sourceJobId) || null,
    event_id: normalizeText(input.eventId) || null,
    pass_id: normalizeText(input.passId) || null,
    error_message: normalizeText(input.error || "unknown_error").slice(0, 500),
    payload: input.payload && typeof input.payload === "object" ? input.payload : {},
    created_at: toIso(input.now),
  };
}

export function mergeJoinClickMetrics(current = {}, clickedAtInput) {
  const clickedAt = toIso(clickedAtInput);
  const first = normalizeText(current.first_at);
  const latest = normalizeText(current.latest_at);
  const count = Number.isFinite(Number(current.count)) ? Number(current.count) : 0;

  return {
    first_at: first || clickedAt,
    latest_at: latest && new Date(latest).getTime() > new Date(clickedAt).getTime() ? latest : clickedAt,
    count: count + 1,
  };
}

export function buildGhlWritebackFields(input = {}) {
  const join = input.join || {};
  return {
    showfi_pass_issued_at: normalizeText(input.passIssuedAt) || "",
    showfi_wallet_added_at: normalizeText(input.walletAddedAt) || "",
    showfi_join_click_first_at: normalizeText(join.first_at) || "",
    showfi_join_click_latest_at: normalizeText(join.latest_at) || "",
    showfi_join_click_count: String(Number.isFinite(Number(join.count)) ? Number(join.count) : 0),
  };
}

export function buildOpsHealthBadges(input = {}) {
  const walletFailed = clampPositiveInt(input.walletFailed, 0);
  const reminderFailed = clampPositiveInt(input.reminderFailed, 0);
  const deadLetters = clampPositiveInt(input.deadLetters, 0);
  const feedCount = clampPositiveInt(input.feedCount, 0);

  const severity = deadLetters > 0 || walletFailed > 0 || reminderFailed > 0
    ? "error"
    : feedCount > 0
      ? "warn"
      : "healthy";

  return {
    severity,
    badges: [
      { key: "wallet_updates", label: "Wallet Updates", value: walletFailed, tone: walletFailed > 0 ? "error" : "ok" },
      { key: "reminders", label: "Reminders", value: reminderFailed, tone: reminderFailed > 0 ? "error" : "ok" },
      { key: "dead_letter", label: "Dead Letter", value: deadLetters, tone: deadLetters > 0 ? "error" : "ok" },
      { key: "error_feed", label: "Error Feed", value: feedCount, tone: feedCount > 0 ? "warn" : "ok" },
    ],
  };
}

export { MAX_REMINDERS_PER_EVENT };
