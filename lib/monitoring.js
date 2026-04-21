import * as Sentry from "@sentry/node";

function boolFromEnv(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

let sentryInitialized = false;
function ensureSentryInitialized() {
  if (sentryInitialized) return true;
  const dsn = String(process.env.SENTRY_DSN || "").trim();
  if (!dsn) return false;
  Sentry.init({
    dsn,
    environment: String(process.env.SENTRY_ENVIRONMENT || process.env.VERCEL_ENV || process.env.NODE_ENV || "development"),
    release: process.env.VERCEL_GIT_COMMIT_SHA || undefined,
    tracesSampleRate: 0,
    sendDefaultPii: false,
  });
  sentryInitialized = true;
  return true;
}

export function getMonitoringConfig() {
  return {
    sentry: {
      enabled: boolFromEnv(process.env.SENTRY_ENABLED) || Boolean(process.env.SENTRY_DSN),
      dsnConfigured: Boolean(String(process.env.SENTRY_DSN || "").trim()),
      environment: String(process.env.SENTRY_ENVIRONMENT || process.env.VERCEL_ENV || process.env.NODE_ENV || "development"),
    },
    uptime: {
      enabled: boolFromEnv(process.env.UPTIME_MONITOR_ENABLED),
      pingTokenConfigured: Boolean(String(process.env.UPTIME_MONITOR_PING_TOKEN || "").trim()),
      pingUrlConfigured: Boolean(String(process.env.UPTIME_MONITOR_PING_URL || "").trim()),
    },
    slack: {
      enabled: false,
      deferred: true,
    },
  };
}

export function captureMonitoringError(error, context = {}) {
  if (!ensureSentryInitialized()) return;
  try {
    Sentry.withScope((scope) => {
      if (context && typeof context === "object") {
        for (const [k, v] of Object.entries(context)) {
          scope.setExtra(k, v);
        }
      }
      if (error instanceof Error) {
        Sentry.captureException(error);
      } else {
        Sentry.captureMessage(String(error || "unknown_error"), "error");
      }
    });
  } catch (e) {
    console.error("[monitoring:sentry] capture_failed", e);
  }
}

