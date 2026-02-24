function normalizeBaseUrl(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  try {
    const parsed = new URL(value);
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

export function getRequestBaseUrl(req) {
  const protoRaw = req?.headers?.["x-forwarded-proto"] || "https";
  const envHost = process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL || "";
  const hostRaw = req?.headers?.["x-forwarded-host"] || req?.headers?.host || envHost;
  const requestedProtocol = String(protoRaw).split(",")[0].trim().toLowerCase();
  const protocol = requestedProtocol === "https" || requestedProtocol === "http"
    ? requestedProtocol
    : "https";
  const host = String(hostRaw).split(",")[0].trim();
  if (!host) return "";
  if (host === String(envHost).trim()) {
    return `https://${host}`;
  }
  return `${protocol}://${host}`;
}

export function getPublicBaseUrl(req) {
  const explicit = normalizeBaseUrl(process.env.PUBLIC_BASE_URL);
  if (explicit) return explicit;
  return normalizeBaseUrl(getRequestBaseUrl(req));
}

export function buildClaimUrl(req, claimToken) {
  const claimPath = `/claim/${encodeURIComponent(String(claimToken || "").trim())}`;
  const base = getPublicBaseUrl(req);
  return base ? `${base}${claimPath}` : claimPath;
}
