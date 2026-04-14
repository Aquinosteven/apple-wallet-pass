import crypto from "node:crypto";

function normalizeText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

export function secureEqual(left, right) {
  const leftBuf = Buffer.from(String(left || ""), "utf8");
  const rightBuf = Buffer.from(String(right || ""), "utf8");
  if (leftBuf.length === 0 || rightBuf.length === 0) return false;
  if (leftBuf.length !== rightBuf.length) return false;
  return crypto.timingSafeEqual(leftBuf, rightBuf);
}

export function getHeader(req, name) {
  const direct = req?.headers?.[name];
  if (typeof direct === "string") return direct;

  const lower = req?.headers?.[name.toLowerCase()];
  if (typeof lower === "string") return lower;

  const upper = req?.headers?.[name.toUpperCase()];
  if (typeof upper === "string") return upper;

  return "";
}

export function validateSharedSecretHeader(req, expectedSecret, headerNames) {
  const names = (Array.isArray(headerNames) ? headerNames : [headerNames])
    .map((name) => normalizeText(name))
    .filter(Boolean);
  const provided = names.map((name) => normalizeText(getHeader(req, name))).find(Boolean) || "";

  if (!provided) {
    return {
      ok: false,
      status: 401,
      error: `Missing ${names.join(" or ")}`,
    };
  }

  if (!secureEqual(provided, expectedSecret)) {
    return {
      ok: false,
      status: 403,
      error: `Invalid ${names.join(" or ")}`,
    };
  }

  return { ok: true, status: 200, error: "" };
}
