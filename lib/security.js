function firstHeaderValue(value) {
  if (!value) return "";
  return String(value).split(",")[0].trim();
}

export function getClientIp(req) {
  const forwardedFor = firstHeaderValue(req?.headers?.["x-forwarded-for"]);
  const realIp = firstHeaderValue(req?.headers?.["x-real-ip"]);
  const socketIp = req?.socket?.remoteAddress ? String(req.socket.remoteAddress) : "";
  return (forwardedFor || realIp || socketIp || "unknown").slice(0, 120);
}

export function getRequestContext(req) {
  return {
    ip: getClientIp(req),
    userAgent: String(req?.headers?.["user-agent"] || "").slice(0, 512),
    referrer: String(req?.headers?.referer || req?.headers?.referrer || "").slice(0, 1024),
    method: String(req?.method || ""),
    path: String(req?.url || ""),
  };
}

export function setNoStore(res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
}

export function maybeLogSuspiciousRequest(req, details = {}) {
  const ctx = getRequestContext(req);
  const ua = ctx.userAgent.toLowerCase();
  const referrer = ctx.referrer.toLowerCase();

  const suspiciousSignals = [
    ua.length === 0 ? "missing_ua" : null,
    /(sqlmap|nikto|nmap|acunetix|nessus|bot|crawler|spider)/.test(ua) ? "scanner_ua" : null,
    /(\.ru|\.xyz|free-money|viagra|casino)/.test(referrer) ? "suspicious_referrer" : null,
    ctx.path.length > 400 ? "long_path" : null,
  ].filter(Boolean);

  if (!suspiciousSignals.length) return;

  console.warn("[security] suspicious request observed", {
    endpoint: details.endpoint || "unknown",
    signals: suspiciousSignals,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
    referrer: ctx.referrer,
  });
}

export function sendRateLimitExceeded(res, retryAfterSeconds) {
  return res.status(429).json({
    ok: false,
    error: "Rate limit exceeded",
    retryAfterSeconds,
  });
}
