import { getSupabaseAdmin } from "./ghlIntegration.js";
import { getSupabaseUnavailableMessage, isSupabaseUnavailableError } from "./supabaseError.js";

const DEFAULT_DEV_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
];

function getBearerToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || typeof authHeader !== "string") {
    return "";
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return "";
  }

  return token.trim();
}

function appendVaryHeader(res, value) {
  const current = String(res.getHeader?.("Vary") || "").trim();
  if (!current) {
    res.setHeader("Vary", value);
    return;
  }

  const values = new Set(current.split(",").map((entry) => entry.trim()).filter(Boolean));
  values.add(value);
  res.setHeader("Vary", [...values].join(", "));
}

function normalizeOrigin(value) {
  if (typeof value !== "string") return "";
  try {
    const parsed = new URL(value.trim());
    return `${parsed.protocol}//${parsed.host}`.toLowerCase();
  } catch {
    return "";
  }
}

function getRequestOrigin(req) {
  const rawOrigin = req?.headers?.origin;
  return normalizeOrigin(rawOrigin);
}

function normalizeDomainOrigin(value) {
  const normalized = String(value || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (!normalized) return "";
  return normalizeOrigin(`https://${normalized}`);
}

function collectConfiguredOrigins(extraOrigins = []) {
  const configuredValues = [
    process.env.CORS_ALLOWED_ORIGINS,
    process.env.APP_ORIGIN,
    process.env.PUBLIC_APP_ORIGIN,
    process.env.VITE_APP_ORIGIN,
    process.env.SITE_URL,
  ];

  const parsed = configuredValues
    .flatMap((value) => String(value || "").split(","))
    .map((value) => normalizeOrigin(value))
    .filter(Boolean);

  const prodDomainOrigin = normalizeDomainOrigin(process.env.PROD_DOMAIN);
  if (prodDomainOrigin) parsed.push(prodDomainOrigin);

  if (String(process.env.NODE_ENV || "").toLowerCase() !== "production") {
    parsed.push(...DEFAULT_DEV_ALLOWED_ORIGINS);
  }

  for (const origin of extraOrigins) {
    const normalized = normalizeOrigin(origin);
    if (normalized) parsed.push(normalized);
  }

  return [...new Set(parsed)];
}

export async function getAuthenticatedUser(req) {
  const token = getBearerToken(req);
  if (!token) {
    return { user: null, error: "Missing Authorization bearer token", status: 401 };
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return { user: null, error: "Invalid or expired auth token", status: 401 };
    }

    return { user: data.user, error: null, status: 200 };
  } catch (error) {
    if (isSupabaseUnavailableError(error)) {
      return { user: null, error: getSupabaseUnavailableMessage(), status: 503 };
    }

    return { user: null, error: "Invalid or expired auth token", status: 401 };
  }
}

export function setJsonCors(req, res, methods, allowAuthOrOptions = true) {
  const options = typeof allowAuthOrOptions === "boolean"
    ? { allowAuth: allowAuthOrOptions }
    : (allowAuthOrOptions || {});
  const allowAuth = options.allowAuth !== false;
  const headers = ["Content-Type"];
  if (allowAuth) headers.push("Authorization", "x-showfi-account-id");
  if (Array.isArray(options.additionalHeaders)) {
    for (const header of options.additionalHeaders) {
      if (typeof header === "string" && header.trim()) {
        headers.push(header.trim());
      }
    }
  }

  res.setHeader("Access-Control-Allow-Methods", methods.join(","));
  res.setHeader("Access-Control-Allow-Headers", [...new Set(headers)].join(", "));

  const requestOrigin = getRequestOrigin(req);
  if (options.allowWildcard === true) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    return { hasOrigin: Boolean(requestOrigin), originAllowed: true, origin: requestOrigin };
  }

  appendVaryHeader(res, "Origin");
  if (!requestOrigin) {
    return { hasOrigin: false, originAllowed: true, origin: "" };
  }

  const allowedOrigins = collectConfiguredOrigins(options.allowedOrigins);
  const originAllowed = allowedOrigins.includes(requestOrigin);
  if (originAllowed) {
    res.setHeader("Access-Control-Allow-Origin", requestOrigin);
  }

  return { hasOrigin: true, originAllowed, origin: requestOrigin };
}

export function rejectDisallowedOrigin(res, cors) {
  if (!cors?.hasOrigin || cors.originAllowed) return false;
  res.status(403).json({ ok: false, error: "Origin not allowed" });
  return true;
}
