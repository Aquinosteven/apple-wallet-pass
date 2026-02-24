// api/pass.js

import crypto from "crypto";
import { generateApplePass } from "../lib/generatePass.js";
import {
  isValidEmail,
  isValidHttpUrl,
  readJsonBodyStrict,
  validateStringField,
} from "../lib/requestValidation.js";
import { limiters } from "../lib/rateLimit.js";
import { getClientIp, maybeLogSuspiciousRequest, sendRateLimitExceeded, setNoStore } from "../lib/security.js";
import { trackClaimEventFromRequest } from "../lib/claimEvents.js";

function isValidRGBString(s) {
  if (typeof s !== "string") return false;
  const m = s.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
  if (!m) return false;
  const r = Number(m[1]), g = Number(m[2]), b = Number(m[3]);
  return [r, g, b].every((n) => Number.isInteger(n) && n >= 0 && n <= 255);
}

function parseBase64DataUrl(dataUrl) {
  if (typeof dataUrl !== "string") return null;
  const match = dataUrl.match(/^data:(image\/png|image\/jpeg);base64,(.+)$/i);
  if (!match) return null;
  const mimeType = match[1].toLowerCase();
  const base64 = match[2];
  try {
    const buffer = Buffer.from(base64, "base64");
    if (!buffer.length) return null;
    return { mimeType, buffer };
  } catch {
    return null;
  }
}

function hexToRgbString(value) {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return null;
  let hex = match[1];
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }
  const num = Number.parseInt(hex, 16);
  if (Number.isNaN(num)) return null;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgb(${r},${g},${b})`;
}

function parsePngHeader(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 33) return null;
  const signature = buffer.subarray(0, 8);
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!signature.equals(pngSignature)) return null;
  const ihdrLength = buffer.readUInt32BE(8);
  const ihdrType = buffer.subarray(12, 16).toString("ascii");
  if (ihdrType !== "IHDR" || ihdrLength < 13 || buffer.length < 33) return null;
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const colorType = buffer.readUInt8(25);
  return { width, height, colorType };
}

function enforceLimits(req, res) {
  const byIp = limiters.generateByIp(getClientIp(req));
  if (!byIp.allowed) {
    sendRateLimitExceeded(res, byIp.retryAfterSeconds);
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  // CORS (temporary permissive)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  setNoStore(res);
  maybeLogSuspiciousRequest(req, { endpoint: "/api/pass" });

  if (req.method === "OPTIONS") return res.status(204).end();
  if (!["GET", "POST"].includes(req.method || "")) {
    return res.status(405).json({ ok: false, message: "Use GET or POST" });
  }
  if (!enforceLimits(req, res)) return;

  try {
    let payload = null;
    if (req.method === "POST") {
      const parsedBody = await readJsonBodyStrict(req);
      if (!parsedBody.ok) {
        await trackClaimEventFromRequest(req, {
          eventType: "claim_error",
          metadata: { endpoint: "/api/pass", status: parsedBody.status, error: parsedBody.error },
        });
        return res.status(parsedBody.status).json({
          ok: false,
          message: parsedBody.error,
        });
      }
      payload = parsedBody.body;
      if (!payload || typeof payload !== "object") {
        return res.status(400).json({
          ok: false,
          message: "Invalid JSON body",
        });
      }
    } else if (req.method !== "GET") {
      return res.status(405).json({ ok: false, message: "Use GET or POST" });
    }

    const attendee = payload?.attendee && typeof payload.attendee === "object" ? payload.attendee : {};
    const event = payload?.event && typeof payload.event === "object" ? payload.event : {};
    const branding = payload?.branding && typeof payload.branding === "object" ? payload.branding : {};
    const theme = payload?.theme && typeof payload.theme === "object" ? payload.theme : null;

    const attendeeName = attendee?.name ? String(attendee.name).trim() : "";
    const attendeeEmail = attendee?.email ? String(attendee.email).trim() : "";
    const attendeePhone = attendee?.phone ? String(attendee.phone).trim() : "";

    const eventTitle = event?.title ? String(event.title).trim() : "";
    const startsAt = event?.startsAt ? String(event.startsAt).trim() : "";
    const joinUrl = event?.joinUrl ? String(event.joinUrl).trim() : "";

    const logoBase64 = branding?.logoBase64 ? String(branding.logoBase64).trim() : "";

    const brand = payload?.brand && typeof payload.brand === "object" ? payload.brand : {};
    let backgroundColor =
      isValidRGBString(brand.backgroundColor) ? brand.backgroundColor : "rgb(32,32,32)";
    const foregroundColor =
      isValidRGBString(brand.foregroundColor) ? brand.foregroundColor : "rgb(255,255,255)";
    const labelColor =
      isValidRGBString(brand.labelColor) ? brand.labelColor : "rgb(255,255,255)";

    const errors = [];
    if (!attendeeName) errors.push("attendee.name");
    if (!attendeeEmail) errors.push("attendee.email");
    if (!eventTitle) errors.push("event.title");
    if (!startsAt) errors.push("event.startsAt");
    if (!joinUrl) errors.push("event.joinUrl");
    if (!logoBase64) errors.push("branding.logoBase64");

    let joinUrlIsValid = false;
    if (joinUrl) {
      try {
        new URL(joinUrl);
        joinUrlIsValid = true;
      } catch {
        joinUrlIsValid = false;
      }
    }
    if (joinUrl && !joinUrlIsValid) errors.push("event.joinUrl (invalid URL)");
    if (attendeeEmail && !isValidEmail(attendeeEmail)) errors.push("attendee.email (invalid email)");
    if (joinUrl && !isValidHttpUrl(joinUrl)) errors.push("event.joinUrl (invalid URL)");

    const fieldChecks = [
      validateStringField(attendeeName, { field: "attendee.name", required: true, min: 1, max: 120 }),
      validateStringField(attendeeEmail, { field: "attendee.email", required: true, min: 5, max: 200 }),
      validateStringField(attendeePhone, { field: "attendee.phone", required: false, min: 0, max: 40 }),
      validateStringField(eventTitle, {
        field: "event.title",
        required: true,
        min: 2,
        max: 140,
        pattern: /^[\w\s.,:&'()\-+/@#]+$/i,
      }),
      validateStringField(startsAt, { field: "event.startsAt", required: true, min: 8, max: 80 }),
      validateStringField(joinUrl, { field: "event.joinUrl", required: true, min: 10, max: 2048 }),
    ];
    for (const check of fieldChecks) {
      if (!check.ok) errors.push(check.error);
    }

    const parsedStartsAt = Date.parse(startsAt);
    if (startsAt && Number.isNaN(parsedStartsAt)) errors.push("event.startsAt (invalid datetime)");

    const parsedLogo = parseBase64DataUrl(logoBase64);
    if (logoBase64 && !parsedLogo) errors.push("branding.logoBase64 (invalid data URL)");
    if (parsedLogo && parsedLogo.mimeType !== "image/png") {
      errors.push("branding.logoBase64 (must be a PNG data URL)");
    }

    let themeMode = null;
    let themeBackgroundColor = null;
    let parsedStrip = null;
    let stripInfo = null;
    let stripValid = false;
    if (theme) {
      themeMode = theme?.mode ? String(theme.mode).toLowerCase() : "";
      if (!["color", "image"].includes(themeMode)) {
        errors.push("theme.mode (must be color or image)");
      }
      themeBackgroundColor = hexToRgbString(theme?.backgroundColor);
      if (!themeBackgroundColor) {
        errors.push("theme.backgroundColor (invalid hex color)");
      }
      if (themeMode === "image") {
        const stripBase64 = theme?.stripImageBase64
          ? String(theme.stripImageBase64).trim()
          : "";
        console.log("Theme strip received:", Boolean(stripBase64));
        parsedStrip = parseBase64DataUrl(stripBase64);
        if (!stripBase64) {
          console.warn("Theme strip image missing: theme.stripImageBase64 empty");
          errors.push("theme.stripImageBase64 (invalid data URL)");
        } else if (!parsedStrip) {
          console.warn("Theme strip image invalid data URL");
          errors.push("theme.stripImageBase64 (invalid data URL)");
        } else if (parsedStrip.mimeType !== "image/png") {
          console.warn(
            `Theme strip image must be PNG, received ${parsedStrip.mimeType}`
          );
          errors.push("theme.stripImageBase64 (must be a PNG data URL)");
        } else {
          stripInfo = parsePngHeader(parsedStrip.buffer);
          if (!stripInfo) {
            console.warn("Theme strip image PNG header invalid");
            errors.push("theme.stripImageBase64 (invalid PNG data)");
          } else {
            console.log(
              `Theme strip size: ${stripInfo.width}x${stripInfo.height}`
            );
            if (stripInfo.width !== 1125 || stripInfo.height !== 243) {
              console.warn(
                `Theme strip invalid size: ${stripInfo.width}x${stripInfo.height}`
              );
              errors.push(
                `theme.stripImageBase64 (must be 1125x243px, got ${stripInfo.width}x${stripInfo.height})`
              );
            }
            if (stripInfo.colorType !== 2) {
              console.warn(
                `Theme strip invalid color type: ${stripInfo.colorType}`
              );
              errors.push("theme.stripImageBase64 (must be RGB with no alpha)");
            }
          }
          stripValid =
            !!stripInfo &&
            stripInfo.width === 1125 &&
            stripInfo.height === 243 &&
            stripInfo.colorType === 2;
        }
      }
    }

    if (themeMode === "image") {
      res.setHeader("X-Has-Strip", stripValid ? "true" : "false");
    }

    if (errors.length) {
      return res.status(400).json({
        ok: false,
        message: "Missing or invalid fields",
        fields: errors,
      });
    }

    if (themeMode && themeBackgroundColor) {
      backgroundColor = themeBackgroundColor;
    }

    const serialNumber = `SER-${crypto.randomUUID()}`;
    const { pkpassBuffer, filename } = await generateApplePass({
      attendeeName,
      attendeeEmail,
      attendeePhone,
      eventTitle,
      startsAt,
      joinUrl,
      serialNumber,
      backgroundColor,
      foregroundColor,
      labelColor,
      logoBuffer: parsedLogo?.buffer || null,
      stripBuffer: themeMode === "image" && stripValid && parsedStrip?.buffer ? parsedStrip.buffer : null,
    });

    await trackClaimEventFromRequest(req, {
      eventType: "pkpass_downloaded",
      metadata: {
        endpoint: "/api/pass",
        attendeeEmail,
        eventTitle,
      },
    });

    res.setHeader("Content-Type", "application/vnd.apple.pkpass");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(pkpassBuffer);
  } catch (err) {
    await trackClaimEventFromRequest(req, {
      eventType: "claim_error",
      metadata: {
        endpoint: "/api/pass",
        status: 500,
        error: err?.message || String(err),
      },
    });
    if (Array.isArray(err?.missing) && err.missing.length) {
      return res.status(500).json({
        ok: false,
        message: "Missing required environment variables",
        missing: err.missing,
      });
    }
    console.error("API /api/pass error:", err);
    return res.status(500).json({
      ok: false,
      message: "Failed to generate pass",
      error: err?.message || String(err),
    });
  }
}
