function getHeaderValue(req, name) {
  const direct = req?.headers?.[name];
  if (typeof direct === "string") return direct;

  const lowered = name.toLowerCase();
  const upper = name.toUpperCase();
  const lowerValue = req?.headers?.[lowered];
  if (typeof lowerValue === "string") return lowerValue;
  const upperValue = req?.headers?.[upper];
  if (typeof upperValue === "string") return upperValue;
  return "";
}

export function hasJsonContentType(req) {
  const contentType = getHeaderValue(req, "content-type").toLowerCase();
  return contentType.includes("application/json");
}

export function asTrimmedString(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

export function validateStringField(value, options = {}) {
  const {
    field = "field",
    required = false,
    min = 0,
    max = 255,
    pattern = null,
  } = options;
  const normalized = asTrimmedString(value);

  if (!normalized) {
    if (required) return { ok: false, error: `${field} is required`, value: "" };
    return { ok: true, value: "" };
  }
  if (normalized.length < min || normalized.length > max) {
    return {
      ok: false,
      error: `${field} must be between ${min} and ${max} characters`,
      value: "",
    };
  }
  if (pattern && !pattern.test(normalized)) {
    return { ok: false, error: `${field} is invalid`, value: "" };
  }
  return { ok: true, value: normalized };
}

export function isValidHttpUrl(value) {
  const str = asTrimmedString(value);
  if (!str) return false;
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isValidEmail(value) {
  const str = asTrimmedString(value);
  if (!str) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
}

export async function readJsonBodyStrict(req, options = {}) {
  const { allowEmpty = false } = options;

  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return { ok: true, body: req.body };
  }

  if (!hasJsonContentType(req)) {
    return {
      ok: false,
      status: 415,
      error: "Content-Type must be application/json",
    };
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8").trim();

  if (!raw) {
    if (allowEmpty) {
      return { ok: true, body: {} };
    }
    return { ok: false, status: 400, error: "Request body is required" };
  }

  try {
    return { ok: true, body: JSON.parse(raw) };
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON body" };
  }
}
