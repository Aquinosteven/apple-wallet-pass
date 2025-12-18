// api/pass.js

import * as passkitModule from "passkit-generator";
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

    const eventName = String(payload?.eventName || "Demo Event").trim();
    const hostName = String(payload?.hostName || "AttendOS").trim();
    const startDateTimeISO = payload?.startDateTimeISO
      ? String(payload.startDateTimeISO).trim()
      : "";
    const timezone = payload?.timezone ? String(payload.timezone).trim() : "";
    const attendeeName = payload?.attendeeName ? String(payload.attendeeName).trim() : "";
    const attendeeEmail = payload?.attendeeEmail ? String(payload.attendeeEmail).trim() : "";

    const brand = payload?.brand && typeof payload.brand === "object" ? payload.brand : {};
    const backgroundColor =
      isValidRGBString(brand.backgroundColor) ? brand.backgroundColor : "rgb(32,32,32)";
    const foregroundColor =
      isValidRGBString(brand.foregroundColor) ? brand.foregroundColor : "rgb(255,255,255)";
    const labelColor =
      isValidRGBString(brand.labelColor) ? brand.labelColor : "rgb(255,255,255)";

    const wwdr = Buffer.from(WWDR_PEM, "base64");
    const signerCert = Buffer.from(SIGNER_CERT_PEM, "base64");
    const signerKey = Buffer.from(SIGNER_KEY_PEM, "base64");

    const serialSeed = attendeeEmail || attendeeName || "anon";
    const serialNumber = `SER-${Date.now()}-${Buffer.from(serialSeed).toString("hex").slice(0, 12)}`;

    const primaryFields = [
      { key: "event", label: "Event", value: eventName || "Demo Event" },
    ];

    const secondaryFields = [
      { key: "host", label: "Host", value: hostName || "AttendOS" },
    ];

    const auxiliaryFields = [
      { key: "start", label: "Starts", value: startDateTimeISO || "TBD" },
    ];

    // Optional: show timezone as separate line
    if (timezone) {
      secondaryFields.push({ key: "tz", label: "Timezone", value: timezone });
    }

    const pass = await PKPass.from(
      {
        model: "generic.pass",
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
        description: `${eventName} Ticket`,
        serialNumber,
        generic: {
          primaryFields,
          secondaryFields,
          auxiliaryFields,
        },
        backgroundColor,
        foregroundColor,
        labelColor,
      }
    );

    const pkpassBuffer = pass.getAsBuffer();
    const filename = `${safeFileName(eventName)}-ticket-${serialNumber}.pkpass`;

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
