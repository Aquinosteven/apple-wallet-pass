function boolFromEnv(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export function getMonitoringConfig() {
  return {
    sentry: {
      enabled: boolFromEnv(process.env.SENTRY_ENABLED) || Boolean(process.env.SENTRY_DSN),
      dsnConfigured: Boolean(String(process.env.SENTRY_DSN || "").trim()),
      environment: String(process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development"),
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
  const message = error instanceof Error ? error.message : String(error || "unknown_error");
  const config = getMonitoringConfig();
  if (!config.sentry.enabled) return;
  console.error("[monitoring:sentry]", { message, context });
}

