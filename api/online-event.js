import * as passkitModule from "passkit-generator";
import crypto from "node:crypto";

const { PKPass } = passkitModule;

function isValidRgbString(value) {
  if (typeof value !== "string") return false;
  const match = value.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
  if (!match) return false;
  const numbers = match.slice(1).map((part) => Number(part));
  return numbers.every((num) => Number.isInteger(num) && num >= 0 && num <= 255);
}

function hexToRgbString(value) {
  const hex = value.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgb(${r},${g},${b})`;
}

function normalizeColor(input, fallback) {
  if (!input) return fallback;
  if (isValidRgbString(input)) return input;
  const rgb = hexToRgbString(input);
  return rgb || fallback;
}

function safeFileName(input, fallback = "pass") {
  const value = (input || "").toString().trim();
  if (!value) return fallback;
  const cleaned = value.replace(/[^\w\- ]+/g, "").replace(/\s+/g, "-").slice(0, 60);
  return cleaned || fallback;
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

function decodePngBase64(input, label, errors) {
  if (!input) return null;
  const value = String(input).trim();
  if (!value) return null;

  let base64Data = value;

  if (value.startsWith("data:")) {
    const match = value.match(/^data:(image\/png);base64,(.+)$/i);
    if (!match) {
      errors.push(`${label} must be a PNG image.`);
      return null;
    }
    base64Data = match[2];
  }

  try {
    const buffer = Buffer.from(base64Data, "base64");
    if (!buffer.length) {
      errors.push(`${label} image data is empty.`);
      return null;
    }
    return buffer;
  } catch {
    errors.push(`${label} image data is invalid base64.`);
    return null;
  }
}

function asString(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Use POST" });
  }

  const {
    APPLE_PASS_TYPE_ID,
    APPLE_TEAM_ID,
    APPLE_ORG_NAME,
    SIGNER_CERT_PEM_B64,
    SIGNER_KEY_PEM_B64,
    SIGNER_KEY_PASSPHRASE,
    WWDR_PEM,
  } = process.env;

  const missingEnv = [];
  if (!APPLE_PASS_TYPE_ID) missingEnv.push("APPLE_PASS_TYPE_ID");
  if (!APPLE_TEAM_ID) missingEnv.push("APPLE_TEAM_ID");
  if (!APPLE_ORG_NAME) missingEnv.push("APPLE_ORG_NAME");
  if (!SIGNER_CERT_PEM_B64) missingEnv.push("SIGNER_CERT_PEM_B64");
  if (!SIGNER_KEY_PEM_B64) missingEnv.push("SIGNER_KEY_PEM_B64");
  if (!WWDR_PEM) missingEnv.push("WWDR_PEM");

  if (missingEnv.length) {
    return res.status(500).json({
      ok: false,
      code: "SIGNING_NOT_CONFIGURED",
      message: "Signing not configured. Set the required Apple Wallet environment variables.",
      missing: missingEnv,
    });
  }

  const payload = await readJsonBody(req);
  if (!payload) {
    return res.status(400).json({
      ok: false,
      message: "Invalid or missing JSON body. Send Content-Type: application/json",
    });
  }

  const errors = [];

  const eventTitle = asString(payload.eventTitle);
  const eventSeries = asString(payload.eventSeries);
  const organizationNameInput = asString(payload.organizationName);
  const organizationName = organizationNameInput || APPLE_ORG_NAME;
  const hostName = asString(payload.hostName);
  const startDateTimeISO = asString(payload.startDateTimeISO);
  const endDateTimeISO = asString(payload.endDateTimeISO);
  const durationMinutesRaw = payload.durationMinutes;
  const timezone = asString(payload.timezone);
  const joinLinkLabel = asString(payload.joinLinkLabel);
  const joinLinkUrl = asString(payload.joinLinkUrl);
  const recipientName = asString(payload.recipientName);
  const recipientEmail = asString(payload.recipientEmail);
  const seatOrTier = asString(payload.seatOrTier);
  const checkInCode = asString(payload.checkInCode);
  const agenda = asString(payload.agenda);
  const supportText = asString(payload.supportText);
  const fallbackText = asString(payload.fallbackText);

  if (!eventTitle) errors.push("Event title is required.");
  if (!eventSeries) errors.push("Event series or program name is required.");
  if (!organizationName) errors.push("Organization name is required.");
  if (!hostName) errors.push("Host or presenter name is required.");
  if (!startDateTimeISO) errors.push("Start date/time is required.");
  if (!timezone) errors.push("Time zone is required.");
  if (!joinLinkLabel) errors.push("Join link label is required.");
  if (!joinLinkUrl) errors.push("Join link URL is required.");
  if (joinLinkUrl && !isValidUrl(joinLinkUrl)) {
    errors.push("Join link URL must be a valid http(s) URL.");
  }
  if (!recipientName) errors.push("Recipient name is required.");
  if (!recipientEmail) errors.push("Recipient email is required.");
  if (recipientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    errors.push("Recipient email must be valid.");
  }

  let startDate = null;
  if (startDateTimeISO) {
    const parsed = new Date(startDateTimeISO);
    if (Number.isNaN(parsed.getTime())) {
      errors.push("Start date/time must be a valid ISO date.");
    } else {
      startDate = parsed;
    }
  }

  let endDate = null;
  if (endDateTimeISO) {
    const parsedEnd = new Date(endDateTimeISO);
    if (Number.isNaN(parsedEnd.getTime())) {
      errors.push("End date/time must be a valid ISO date.");
    } else {
      endDate = parsedEnd;
    }
  }

  let durationMinutes = null;
  if (!endDate) {
    if (durationMinutesRaw === undefined || durationMinutesRaw === null || durationMinutesRaw === "") {
      errors.push("Provide either an end date/time or a duration in minutes.");
    } else {
      const parsedDuration = Number(durationMinutesRaw);
      if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) {
        errors.push("Duration must be a positive number of minutes.");
      } else {
        durationMinutes = Math.round(parsedDuration);
      }
    }
  }

  const brand = payload.brand && typeof payload.brand === "object" ? payload.brand : {};
  const backgroundColor = normalizeColor(brand.backgroundColor, "rgb(32,32,32)");
  const foregroundColor = normalizeColor(brand.foregroundColor, "rgb(255,255,255)");
  const labelColor = normalizeColor(brand.labelColor, "rgb(255,255,255)");

  const logoImage = decodePngBase64(payload.logoImage, "Logo", errors);
  const stripImage = decodePngBase64(payload.stripImage, "Hero/strip", errors);
  const thumbnailImage = decodePngBase64(payload.thumbnailImage, "Thumbnail", errors);
  const iconImage = decodePngBase64(payload.iconImage, "Icon", errors);

  if (errors.length) {
    return res.status(400).json({
      ok: false,
      message: "Please fix the highlighted fields.",
      errors,
    });
  }

  try {
    const start = startDate;
    if (!endDate && durationMinutes && start) {
      endDate = new Date(start.getTime() + durationMinutes * 60 * 1000);
    }

    const expirationDate = endDate ? new Date(endDate.getTime() + 2 * 60 * 60 * 1000) : null;
    const relevantDate = start ? new Date(start.getTime() - 15 * 60 * 1000) : null;

    const serialSeed = `${eventTitle}|${recipientEmail}|${start?.toISOString() || ""}`;
    const serialHash = crypto.createHash("sha1").update(serialSeed).digest("hex").slice(0, 12);
    const serialNumber = `EVT-${serialHash}`;

    let signerCert;
    let signerKey;
    let wwdr;
    try {
      signerCert = Buffer.from(SIGNER_CERT_PEM_B64, "base64");
    } catch (error) {
      return res.status(500).json({
        ok: false,
        code: "SIGNING_NOT_CONFIGURED",
        message: "SIGNER_CERT_PEM_B64 is not valid base64.",
      });
    }

    try {
      signerKey = Buffer.from(SIGNER_KEY_PEM_B64, "base64");
    } catch (error) {
      return res.status(500).json({
        ok: false,
        code: "SIGNING_NOT_CONFIGURED",
        message: "SIGNER_KEY_PEM_B64 is not valid base64.",
      });
    }

    try {
      wwdr = Buffer.from(WWDR_PEM, "base64");
    } catch (error) {
      return res.status(500).json({
        ok: false,
        code: "SIGNING_NOT_CONFIGURED",
        message: "WWDR_PEM_B64 is not valid base64.",
      });
    }

    const headerFields = [
      { key: "series", label: "Series", value: eventSeries },
    ];

    const primaryFields = [
      { key: "event", label: "Event", value: eventTitle },
    ];

    const secondaryFields = [
      { key: "host", label: "Host", value: hostName },
      {
        key: "start",
        label: "Starts",
        value: start.toISOString(),
        dateStyle: "PKDateStyleMedium",
        timeStyle: "PKDateStyleShort",
        timeZone: timezone,
      },
    ];

    const auxiliaryFields = [
      { key: "attendee", label: "Attendee", value: recipientName },
    ];

    if (endDate) {
      auxiliaryFields.push({
        key: "ends",
        label: "Ends",
        value: endDate.toISOString(),
        dateStyle: "PKDateStyleMedium",
        timeStyle: "PKDateStyleShort",
        timeZone: timezone,
      });
    }

    if (durationMinutes) {
      auxiliaryFields.push({
        key: "duration",
        label: "Duration",
        value: `${durationMinutes} min`,
      });
    }

    if (seatOrTier) {
      auxiliaryFields.push({
        key: "seat",
        label: "Seat/Tier",
        value: seatOrTier,
      });
    }

    if (checkInCode) {
      auxiliaryFields.push({
        key: "checkin",
        label: "Check-in Code",
        value: checkInCode,
      });
    }

    const backFields = [
      { key: "join", label: joinLinkLabel, value: joinLinkUrl },
      { key: "email", label: "Email", value: recipientEmail },
    ];

    if (agenda) {
      backFields.push({
        key: "agenda",
        label: "Agenda",
        value: agenda,
      });
    }

    if (supportText) {
      backFields.push({
        key: "support",
        label: "Support",
        value: supportText,
      });
    }

    if (fallbackText) {
      backFields.push({
        key: "fallback",
        label: "If Link Fails",
        value: fallbackText,
      });
    }

    if (timezone) {
      backFields.push({
        key: "timezone",
        label: "Time Zone",
        value: timezone,
      });
    }

    const signerKeyPassphrase = SIGNER_KEY_PASSPHRASE || undefined;

    const pass = await PKPass.from(
      {
        model: "generic.pass",
        certificates: {
          wwdr,
          signerCert,
          signerKey,
          signerKeyPassphrase,
        },
      },
      {
        formatVersion: 1,
        passTypeIdentifier: APPLE_PASS_TYPE_ID,
        teamIdentifier: APPLE_TEAM_ID,
        organizationName,
        description: `${eventTitle} Online Event`,
        serialNumber,
        logoText: eventSeries || organizationName,
        relevantDate: relevantDate ? relevantDate.toISOString() : undefined,
        expirationDate: expirationDate ? expirationDate.toISOString() : undefined,
        appLaunchURL: joinLinkUrl,
        backgroundColor,
        foregroundColor,
        labelColor,
        barcodes: [
          {
            message: joinLinkUrl,
            format: "PKBarcodeFormatQR",
            messageEncoding: "iso-8859-1",
            altText: joinLinkLabel,
          },
        ],
        generic: {
          headerFields,
          primaryFields,
          secondaryFields,
          auxiliaryFields,
          backFields,
        },
      }
    );

    if (logoImage) pass.addBuffer("logo.png", logoImage);
    if (stripImage) pass.addBuffer("strip.png", stripImage);
    if (thumbnailImage) pass.addBuffer("thumbnail.png", thumbnailImage);
    if (iconImage) pass.addBuffer("icon.png", iconImage);

    const pkpassBuffer = pass.getAsBuffer();
    const filename = `${safeFileName(eventTitle)}-online-event.pkpass`;

    res.setHeader("Content-Type", "application/vnd.apple.pkpass");
    res.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);
    return res.status(200).send(pkpassBuffer);
  } catch (error) {
    console.error("API /api/online-event error:", error);
    return res.status(500).json({
      ok: false,
      message: "Failed to generate pass.",
      error: error?.message || String(error),
    });
  }
}
