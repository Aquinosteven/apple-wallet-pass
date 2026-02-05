// api/pass.js

import * as passkitModule from "passkit-generator";
import crypto from "crypto";
const { PKPass } = passkitModule;

function isValidRGBString(s) {
  if (typeof s !== "string") return false;
  const m = s.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
  if (!m) return false;
  const r = Number(m[1]), g = Number(m[2]), b = Number(m[3]);
  return [r, g, b].every((n) => Number.isInteger(n) && n >= 0 && n <= 255);
}

function safeFileName(input, fallback = "ticket") {
  const s = (input || "").toString().trim();
  if (!s) return fallback;
  return (
    s.replace(/[^\w\- ]+/g, "").replace(/\s+/g, "-").slice(0, 60) || fallback
  );
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

function formatDateTime(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;

  const contentType = (req.headers["content-type"] || "").toLowerCase();
  if (!contentType.includes("application/json")) return null;

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  // CORS (temporary permissive)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    const {
      SIGNER_CERT_PEM,
      SIGNER_KEY_PEM,
      PASS_P12_PASSWORD,
      WWDR_PEM,
      APPLE_PASS_TYPE_ID,
      APPLE_TEAM_ID,
      APPLE_ORG_NAME,
    } = process.env;

    const missing = [];
    if (!SIGNER_CERT_PEM) missing.push("SIGNER_CERT_PEM");
    if (!SIGNER_KEY_PEM) missing.push("SIGNER_KEY_PEM");
    if (!PASS_P12_PASSWORD) missing.push("PASS_P12_PASSWORD");
    if (!WWDR_PEM) missing.push("WWDR_PEM");
    if (!APPLE_PASS_TYPE_ID) missing.push("APPLE_PASS_TYPE_ID");
    if (!APPLE_TEAM_ID) missing.push("APPLE_TEAM_ID");
    if (!APPLE_ORG_NAME) missing.push("APPLE_ORG_NAME");

    if (missing.length) {
      return res.status(500).json({
        ok: false,
        message: "Missing required environment variables",
        missing,
      });
    }

    let payload = null;
    if (req.method === "POST") {
      payload = await readJsonBody(req);
      if (!payload) {
        return res.status(400).json({
          ok: false,
          message: "Invalid or missing JSON body. Send Content-Type: application/json",
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

    const wwdr = Buffer.from(WWDR_PEM, "base64");
    const signerCert = Buffer.from(SIGNER_CERT_PEM, "base64");
    const signerKey = Buffer.from(SIGNER_KEY_PEM, "base64");

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

    const formattedDateTime = formatDateTime(startsAt);
    if (startsAt && !formattedDateTime) errors.push("event.startsAt (invalid datetime)");

    const parsedLogo = parseBase64DataUrl(logoBase64);
    if (logoBase64 && !parsedLogo) errors.push("branding.logoBase64 (invalid data URL)");
    if (parsedLogo && parsedLogo.mimeType !== "image/png") {
      errors.push("branding.logoBase64 (must be a PNG data URL)");
    }

    let themeMode = null;
    let themeBackgroundColor = null;
    let parsedStrip = null;
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
        }
      }
    }

    if (themeMode === "image") {
      res.setHeader("X-Has-Strip", parsedStrip?.buffer ? "true" : "false");
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

    const pass = await PKPass.from(
      {
        model: "event-ticket.pass",
        certificates: {
          wwdr,
          signerCert,
          signerKey,
          signerKeyPassphrase: PASS_P12_PASSWORD,
        },
      },
      {
        formatVersion: 1,
        passTypeIdentifier: APPLE_PASS_TYPE_ID,
        teamIdentifier: APPLE_TEAM_ID,
        organizationName: APPLE_ORG_NAME,
        description: `${eventTitle} Ticket`,
        serialNumber,
        backgroundColor,
        foregroundColor,
        labelColor,
      }
    );

    const safePhone = attendeePhone ? String(attendeePhone) : "";

    pass.eventTicket = pass.eventTicket || {};
    pass.eventTicket.primaryFields = [
      { key: "eventTitle", label: "EVENT", value: String(eventTitle) },
    ];

    pass.eventTicket.secondaryFields = [
      { key: "attendeeName", label: "NAME", value: String(attendeeName) },
      { key: "eventTime", label: "DATE", value: String(formattedDateTime) },
    ];

    pass.eventTicket.auxiliaryFields = [
      { key: "attendeeEmail", label: "EMAIL", value: String(attendeeEmail) },
      ...(safePhone ? [{ key: "attendeePhone", label: "PHONE", value: safePhone }] : []),
    ];

    pass.eventTicket.backFields = [
      { key: "joinUrl", label: "JOIN LINK", value: String(joinUrl) },
      { key: "serial", label: "SERIAL", value: String(serialNumber) },
    ];

    pass.primaryFields.splice(0, pass.primaryFields.length, ...pass.eventTicket.primaryFields);
    pass.secondaryFields.splice(0, pass.secondaryFields.length, ...pass.eventTicket.secondaryFields);
    pass.auxiliaryFields.splice(0, pass.auxiliaryFields.length, ...pass.eventTicket.auxiliaryFields);
    pass.backFields.splice(0, pass.backFields.length, ...pass.eventTicket.backFields);

    if (parsedLogo?.buffer) {
      pass.addBuffer("icon.png", parsedLogo.buffer);
      pass.addBuffer("logo.png", parsedLogo.buffer);
    }
    if (themeMode === "image" && parsedStrip?.buffer) {
      pass.addBuffer("strip.png", parsedStrip.buffer);
    }

    const pkpassBuffer = pass.getAsBuffer();
    const filename = `${safeFileName(eventTitle)}-ticket-${serialNumber}.pkpass`;

    res.setHeader("Content-Type", "application/vnd.apple.pkpass");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(pkpassBuffer);
  } catch (err) {
    console.error("API /api/pass error:", err);
    return res.status(500).json({
      ok: false,
      message: "Failed to generate pass",
      error: err?.message || String(err),
    });
  }
}
