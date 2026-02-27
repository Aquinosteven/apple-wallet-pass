import { getAuthenticatedUser, setJsonCors } from "../../lib/apiAuth.js";
import { getSupabaseAdmin } from "../../lib/ghlIntegration.js";
import { createPassWithUniqueToken } from "../../lib/claimToken.js";
import {
  applyReminderPauseState,
  buildApplePassUpdateSignal,
  buildAppleRegistrationUpsert,
  buildAppleUnregisterPatch,
  buildCancellationRevocations,
  buildGoogleUpdatePlan,
  buildReminderSchedules,
  buildReissuePolicyDecision,
  canEditReminder,
  planReminderRetry,
} from "../../lib/walletOps.js";
import { readJsonBodyStrict } from "../../lib/requestValidation.js";

function normalizeText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

async function assertEventOwnership(supabase, eventId, userId) {
  const { data, error } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message || "Failed to verify event access");
  if (!data) {
    const denied = new Error("Event not found");
    denied.status = 404;
    throw denied;
  }
}

async function assertPassOwnership(supabase, passId, userId) {
  const { data: pass, error: passError } = await supabase
    .from("passes")
    .select("id,event_id")
    .eq("id", passId)
    .maybeSingle();
  if (passError) throw new Error(passError.message || "Failed to verify pass access");
  if (!pass) {
    const denied = new Error("Pass not found");
    denied.status = 404;
    throw denied;
  }

  await assertEventOwnership(supabase, pass.event_id, userId);
}

async function registerAppleDevice(supabase, body) {
  if (!normalizeText(body.eventId) && !normalizeText(body.passId)) {
    throw new Error("eventId or passId is required");
  }
  const upsert = buildAppleRegistrationUpsert({
    deviceLibraryId: body.deviceLibraryId,
    passTypeIdentifier: body.passTypeIdentifier,
    serialNumber: body.serialNumber,
    pushToken: body.pushToken,
    now: new Date().toISOString(),
  });
  upsert.event_id = normalizeText(body.eventId) || null;
  upsert.pass_id = normalizeText(body.passId) || null;

  const { data, error } = await supabase
    .from("apple_device_registrations")
    .upsert(upsert, { onConflict: "device_library_id,pass_type_identifier,serial_number" })
    .select("id,device_library_id,pass_type_identifier,serial_number,push_token,active,last_seen_at")
    .single();
  if (error) throw new Error(error.message || "Failed to register device");
  return data;
}

async function unregisterAppleDevice(supabase, body) {
  if (!normalizeText(body.eventId) && !normalizeText(body.passId)) {
    throw new Error("eventId or passId is required");
  }
  const patch = buildAppleUnregisterPatch({ now: new Date().toISOString() });
  const { data, error } = await supabase
    .from("apple_device_registrations")
    .update(patch)
    .eq("device_library_id", normalizeText(body.deviceLibraryId))
    .eq("pass_type_identifier", normalizeText(body.passTypeIdentifier))
    .eq("serial_number", normalizeText(body.serialNumber))
    .select("id,active,last_seen_at")
    .maybeSingle();
  if (error) throw new Error(error.message || "Failed to unregister device");
  return data;
}

async function signalPassUpdate(supabase, body) {
  const passId = normalizeText(body.passId);
  if (!passId) throw new Error("passId is required");

  const { data: pass, error: passError } = await supabase
    .from("passes")
    .select("id,event_id,apple_serial_number,google_object_id")
    .eq("id", passId)
    .maybeSingle();
  if (passError) throw new Error(passError.message || "Failed to load pass");
  if (!pass) throw new Error("Pass not found");

  const { data: registrations, error: regError } = await supabase
    .from("apple_device_registrations")
    .select("device_library_id,pass_type_identifier,serial_number,push_token,active")
    .eq("pass_id", passId);
  if (regError) throw new Error(regError.message || "Failed to load Apple registrations");

  const signal = buildApplePassUpdateSignal({
    passTypeIdentifier: body.passTypeIdentifier,
    serialNumber: pass.apple_serial_number || body.serialNumber,
    registrations: registrations || [],
  });

  const jobs = [];
  for (const target of signal.targets) {
    jobs.push({
      pass_id: pass.id,
      event_id: pass.event_id,
      platform: "apple",
      status: "pending",
      payload: {
        deviceLibraryId: target.deviceLibraryId,
        pushToken: target.pushToken,
        serialNumber: target.serialNumber,
        passTypeIdentifier: target.passTypeIdentifier,
      },
    });
  }
  if (pass.google_object_id) {
    jobs.push({
      pass_id: pass.id,
      event_id: pass.event_id,
      platform: "google",
      status: "pending",
      payload: {
        googleObjectId: pass.google_object_id,
      },
    });
  }
  if (jobs.length > 0) {
    const { error: jobError } = await supabase.from("wallet_update_jobs").insert(jobs);
    if (jobError) throw new Error(jobError.message || "Failed to enqueue wallet update jobs");
  }

  return {
    passId,
    appleSignals: signal.signalCount,
    jobsCreated: jobs.length,
  };
}

async function handleGoogleUpdateResult(supabase, body) {
  const passId = normalizeText(body.passId);
  if (!passId) throw new Error("passId is required");
  const success = Boolean(body.success);

  if (success) {
    const { error: updateError } = await supabase
      .from("wallet_update_jobs")
      .update({ status: "succeeded", updated_at: new Date().toISOString(), last_error: null })
      .eq("pass_id", passId)
      .eq("platform", "google")
      .in("status", ["pending", "retrying"]);
    if (updateError) throw new Error(updateError.message || "Failed to mark google update as succeeded");
    return { status: "succeeded", passId };
  }

  const { data: latestJob, error: jobError } = await supabase
    .from("wallet_update_jobs")
    .select("id,attempt_count,event_id")
    .eq("pass_id", passId)
    .eq("platform", "google")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (jobError) throw new Error(jobError.message || "Failed to load google update job");

  const plan = buildGoogleUpdatePlan({
    attemptCount: latestJob?.attempt_count || 0,
    maxAttempts: body.maxAttempts,
    baseDelayMs: body.baseDelayMs,
    maxDelayMs: body.maxDelayMs,
    passId,
    reissueBaseUrl: body.reissueBaseUrl || "",
  });

  if (plan.action === "retry_update") {
    const { error: retryError } = await supabase
      .from("wallet_update_jobs")
      .insert({
        pass_id: passId,
        event_id: latestJob?.event_id || null,
        platform: "google",
        status: "retrying",
        attempt_count: plan.attemptCount,
        retry_at: plan.retryAt,
        last_error: normalizeText(body.error || "google_update_failed"),
        payload: body.payload && typeof body.payload === "object" ? body.payload : {},
      });
    if (retryError) throw new Error(retryError.message || "Failed to schedule google update retry");
    return plan;
  }

  const { error: passError } = await supabase
    .from("passes")
    .update({
      reissue_link_path: plan.fallbackUrl,
      last_updated_at: new Date().toISOString(),
    })
    .eq("id", passId);
  if (passError) throw new Error(passError.message || "Failed to set reissue fallback path");

  await supabase.from("wallet_ops_errors").insert({
    event_id: latestJob?.event_id || null,
    pass_id: passId,
    scope: "google_update",
    severity: "error",
    message: normalizeText(body.error || "Google Wallet update failed repeatedly"),
    metadata: {
      fallbackUrl: plan.fallbackUrl,
      attemptCount: plan.attemptCount,
    },
  });

  return plan;
}

async function reissuePass(supabase, body) {
  const oldPassId = normalizeText(body.passId);
  if (!oldPassId) throw new Error("passId is required");
  const { data: oldPass, error: oldPassError } = await supabase
    .from("passes")
    .select("id,event_id,registrant_id")
    .eq("id", oldPassId)
    .maybeSingle();
  if (oldPassError) throw new Error(oldPassError.message || "Failed to load pass");
  if (!oldPass) throw new Error("Pass not found");

  const created = await createPassWithUniqueToken(supabase, oldPass.event_id, oldPass.registrant_id);
  if (created.error || !created.pass?.id) {
    throw new Error(created.error?.message || created.error || "Failed to create replacement pass");
  }

  const policyDecision = buildReissuePolicyDecision({
    policy: body.policy || "revoke_old",
    oldPassId,
    newPassId: created.pass.id,
    supportsReplacementState: true,
  });

  const updates = [];
  if (policyDecision.oldPassPatch) {
    updates.push(
      supabase.from("passes").update({
        ...policyDecision.oldPassPatch,
        last_updated_at: new Date().toISOString(),
      }).eq("id", oldPassId)
    );
  }
  updates.push(
    supabase.from("passes").update({
      ...policyDecision.newPassPatch,
      last_updated_at: new Date().toISOString(),
    }).eq("id", created.pass.id)
  );
  await Promise.all(updates);

  return {
    oldPassId,
    newPassId: created.pass.id,
    newClaimToken: created.pass.claim_token,
    policy: policyDecision.policy,
  };
}

async function setReminders(supabase, body) {
  const eventId = normalizeText(body.eventId);
  if (!eventId) throw new Error("eventId is required");
  const reminders = Array.isArray(body.reminders) ? body.reminders : [];
  const schedules = buildReminderSchedules({
    reminders,
    eventStartsAt: body.eventStartsAt,
    now: new Date().toISOString(),
  });

  const { data: existing, error: existingError } = await supabase
    .from("reminder_definitions")
    .select("id,send_at")
    .eq("event_id", eventId);
  if (existingError) throw new Error(existingError.message || "Failed to load existing reminders");

  const nowIso = new Date().toISOString();
  for (const row of existing || []) {
    if (!canEditReminder({ runAt: row.send_at, now: nowIso })) {
      throw new Error("At least one reminder is past its latest editable time");
    }
  }

  await supabase.from("reminder_jobs").delete().eq("event_id", eventId);
  await supabase.from("reminder_definitions").delete().eq("event_id", eventId);

  if (schedules.length === 0) return { ok: true, reminderCount: 0 };

  const { data: definitions, error: insertError } = await supabase
    .from("reminder_definitions")
    .insert(
      schedules.map((row) => ({
        event_id: eventId,
        kind: row.kind,
        send_at: row.run_at,
        offset_minutes: row.offset_minutes,
        paused: row.paused,
        latest_editable_at: row.latest_editable_at,
      }))
    )
    .select("id,kind,send_at,offset_minutes,event_id");
  if (insertError) throw new Error(insertError.message || "Failed to save reminders");

  const jobs = (definitions || []).map((row) => ({
    reminder_definition_id: row.id,
    event_id: row.event_id,
    run_at: row.send_at,
    status: "pending",
  }));
  if (jobs.length > 0) {
    const { error: jobsError } = await supabase.from("reminder_jobs").insert(jobs);
    if (jobsError) throw new Error(jobsError.message || "Failed to queue reminder jobs");
  }

  return { ok: true, reminderCount: schedules.length };
}

async function pauseEventReminders(supabase, body) {
  const eventId = normalizeText(body.eventId);
  if (!eventId) throw new Error("eventId is required");
  const patch = applyReminderPauseState({ paused: body.paused, now: new Date().toISOString() });
  await supabase.from("events").update({ reminders_paused: patch.paused }).eq("id", eventId);
  await supabase.from("reminder_definitions").update(patch).eq("event_id", eventId);
  return { ok: true, paused: patch.paused };
}

async function handleReminderJobResult(supabase, body) {
  const jobId = normalizeText(body.jobId);
  if (!jobId) throw new Error("jobId is required");
  if (body.success) {
    await supabase
      .from("reminder_jobs")
      .update({ status: "sent", updated_at: new Date().toISOString(), last_error: null })
      .eq("id", jobId);
    return { status: "sent", jobId };
  }

  const { data: job, error: jobError } = await supabase
    .from("reminder_jobs")
    .select("id,event_id,attempt_count,payload")
    .eq("id", jobId)
    .maybeSingle();
  if (jobError) throw new Error(jobError.message || "Failed to load reminder job");
  if (!job) throw new Error("Reminder job not found");

  const plan = planReminderRetry({
    jobId: job.id,
    eventId: job.event_id,
    payload: job.payload || {},
    attemptCount: job.attempt_count || 0,
    maxAttempts: body.maxAttempts,
    baseDelayMs: body.baseDelayMs,
    maxDelayMs: body.maxDelayMs,
    error: body.error,
  });

  await supabase
    .from("reminder_jobs")
    .update({
      status: plan.status,
      attempt_count: plan.attempt_count,
      retry_at: plan.retry_at,
      last_error: normalizeText(body.error || "reminder_delivery_failed"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (plan.deadLetter) {
    await supabase.from("dead_letter_queue").insert({
      ...plan.deadLetter,
      queue_kind: "reminder",
      source_job_id: jobId,
    });
    await supabase.from("wallet_ops_errors").insert({
      event_id: job.event_id,
      scope: "reminder",
      severity: "error",
      message: normalizeText(body.error || "Reminder failed after max retries"),
      metadata: { jobId },
    });
  }

  return plan;
}

async function cancelEvent(supabase, body) {
  const eventId = normalizeText(body.eventId);
  if (!eventId) throw new Error("eventId is required");

  const { data: passes, error: passesError } = await supabase
    .from("passes")
    .select("id")
    .eq("event_id", eventId);
  if (passesError) throw new Error(passesError.message || "Failed to load passes");
  const revocations = buildCancellationRevocations({
    passIds: (passes || []).map((row) => row.id),
    policy: body.policy || "immediate_revoke_all",
  });

  await supabase
    .from("events")
    .update({
      canceled_at: new Date().toISOString(),
      cancellation_policy: "immediate_revoke_all",
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId);

  if (revocations.length > 0) {
    const passIds = revocations.map((row) => row.id);
    await supabase
      .from("passes")
      .update({
        status: "revoked",
        revoked_at: revocations[0].revoked_at,
        revoked_reason: "event_canceled",
        replacement_state: "revoked",
        last_updated_at: new Date().toISOString(),
      })
      .in("id", passIds);
  }

  return {
    eventId,
    revokedCount: revocations.length,
  };
}

async function cancelAccount(supabase, body, userId) {
  const nowIso = new Date().toISOString();
  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("id")
    .eq("user_id", userId);
  if (eventsError) throw new Error(eventsError.message || "Failed to load account events");
  const eventIds = (events || []).map((row) => row.id);
  if (eventIds.length === 0) return { revokedCount: 0, eventCount: 0 };

  const { data: passes, error: passesError } = await supabase
    .from("passes")
    .select("id")
    .in("event_id", eventIds);
  if (passesError) throw new Error(passesError.message || "Failed to load account passes");

  const revocations = buildCancellationRevocations({
    passIds: (passes || []).map((row) => row.id),
    policy: body.policy || "immediate_revoke_all",
    now: nowIso,
  });

  await supabase
    .from("events")
    .update({
      canceled_at: nowIso,
      cancellation_policy: "immediate_revoke_all",
      updated_at: nowIso,
    })
    .in("id", eventIds);

  if (revocations.length > 0) {
    await supabase
      .from("passes")
      .update({
        status: "revoked",
        revoked_at: nowIso,
        revoked_reason: "account_canceled",
        replacement_state: "revoked",
        last_updated_at: nowIso,
      })
      .in("id", revocations.map((row) => row.id));
  }

  return {
    revokedCount: revocations.length,
    eventCount: eventIds.length,
  };
}

const ACTIONS = {
  register_apple_device: registerAppleDevice,
  unregister_apple_device: unregisterAppleDevice,
  signal_pass_update: signalPassUpdate,
  google_update_result: handleGoogleUpdateResult,
  reissue_pass: reissuePass,
  set_reminders: setReminders,
  pause_reminders: pauseEventReminders,
  reminder_job_result: handleReminderJobResult,
  cancel_event: cancelEvent,
  cancel_account: true,
};

export default async function handler(req, res) {
  setJsonCors(res, ["POST", "OPTIONS"]);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth.user) {
      return res.status(auth.status).json({ ok: false, error: auth.error });
    }

    const parsed = await readJsonBodyStrict(req);
    if (!parsed.ok) {
      return res.status(parsed.status).json({ ok: false, error: parsed.error });
    }
    const body = parsed.body && typeof parsed.body === "object" ? parsed.body : {};
    const action = normalizeText(body.action);
    if (!action || !(action in ACTIONS)) {
      return res.status(400).json({ ok: false, error: "Unsupported action" });
    }

    const eventId = normalizeText(body.eventId);
    const passId = normalizeText(body.passId);
    const supabase = getSupabaseAdmin();
    if (eventId) {
      await assertEventOwnership(supabase, eventId, auth.user.id);
    }
    if (passId) {
      await assertPassOwnership(supabase, passId, auth.user.id);
    }

    const result = action === "cancel_account"
      ? await cancelAccount(supabase, body, auth.user.id)
      : await ACTIONS[action](supabase, body);
    return res.status(200).json({ ok: true, action, result });
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 500;
    return res.status(status).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
