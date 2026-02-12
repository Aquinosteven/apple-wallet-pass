import * as passkitModule from "passkit-generator";
import crypto from "crypto";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createSignedToken, verifySignedToken } from "./_token.js";

const { PKPass } = passkitModule;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PASS_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
const FALLBACK_JOIN_TTL_SECONDS = 45 * 24 * 60 * 60;
const AFTER_EVENT_JOIN_TTL_SECONDS = 30 * 24 * 60 * 60;
const MAX_SHORT_JOIN_URL_LENGTH = 1900;

function safeFileName(input, fallback = "ticket") {
  const s = (input || "").toString().trim();
  if (!s) return fallback;
  return s.replace(/[^\w\- ]+/g, "").replace(/\s+/g, "-").slice(0, 60) || fallback;
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

function getBaseUrl(req) {
  const protoRaw = req.headers["x-forwarded-proto"] || "https";
  const envHost = process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL || "";
  const hostRaw = req.headers["x-forwarded-host"] || req.headers.host || envHost;
  const requestedProtocol = String(protoRaw).split(",")[0].trim().toLowerCase();
  const protocol = requestedProtocol === "https" || requestedProtocol === "http"
    ? requestedProtocol
    : "https";
  const host = String(hostRaw).split(",")[0].trim();
  if (!host) return null;
  if (host === String(envHost).trim()) {
    return `https://${host}`;
  }
  return `${protocol}://${host}`;
}

function getJoinTokenExp(startsAt) {
  const now = Math.floor(Date.now() / 1000);
  if (!startsAt) return now + FALLBACK_JOIN_TTL_SECONDS;
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return now + FALLBACK_JOIN_TTL_SECONDS;
  return Math.floor(start.getTime() / 1000) + AFTER_EVENT_JOIN_TTL_SECONDS;
}

function readBody(req) {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === "object") {
      resolve(req.body);
      return;
    }

    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8").trim();
        resolve(raw ? JSON.parse(raw) : null);
      } catch {
        resolve(null);
      }
    });
    req.on("error", () => resolve(null));
  });
}

function isHttpsUrl(value) {
  if (typeof value !== "string" || !value.startsWith("https://")) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function escapeHtmlAttribute(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getRelevantDate(startsAt) {
  if (!startsAt) return undefined;
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return undefined;
  const lead = new Date(start.getTime() - 10 * 60 * 1000);
  return lead.toISOString();
}

function loadPassAssets() {
  const iconPath = join(__dirname, "..", "event-ticket.pass", "icon.png");
  const logoPath = join(__dirname, "..", "event-ticket.pass", "logo.png");
  const iconBuffer = fs.readFileSync(iconPath);
  let logoBuffer = iconBuffer;
  if (fs.existsSync(logoPath)) logoBuffer = fs.readFileSync(logoPath);
  return { iconBuffer, logoBuffer };
}

function setNoStore(res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key");
}

function parseJoinTokenFromShortUrl(shortJoinUrl) {
  try {
    const parsed = new URL(shortJoinUrl);
    return parsed.searchParams.get("token") || "";
  } catch {
    return "";
  }
}

function shortUrlTooLongResponse(res, shortJoinUrlLength, joinUrlLength) {
  return res.status(400).json({
    ok: false,
    error: "URL_TOO_LONG",
    details: { shortJoinUrlLength, joinUrlLength },
  });
}

async function buildPassBuffer(data) {
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
    const error = new Error(`Missing required environment variables: ${missing.join(", ")}`);
    error.status = 500;
    throw error;
  }

  const wwdr = Buffer.from(WWDR_PEM, "base64");
  const signerCert = Buffer.from(SIGNER_CERT_PEM, "base64");
  const signerKey = Buffer.from(SIGNER_KEY_PEM, "base64");
  const { iconBuffer, logoBuffer } = loadPassAssets();

  const relevantDate = getRelevantDate(data.event.startsAt);
  const pass = await PKPass.from(
    {
      model: join(__dirname, "..", "event-ticket.pass"),
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
      description: `${data.event.title} Ticket`,
      serialNumber: data.serial,
      backgroundColor: "rgb(32,32,32)",
      foregroundColor: "rgb(255,255,255)",
      labelColor: "rgb(255,255,255)",
      relevantDate,
    }
  );

  const formattedDateTime = formatDateTime(data.event.startsAt) || "TBA";
  const safePhone = data.attendee.phone ? String(data.attendee.phone) : "";
  const joinAnchor = `<a href="${escapeHtmlAttribute(data.shortJoinUrl)}">Join Zoom</a>`;

  pass.eventTicket = pass.eventTicket || {};
  pass.eventTicket.primaryFields = [
    { key: "eventTitle", label: "EVENT", value: String(data.event.title) },
  ];
  pass.eventTicket.secondaryFields = [
    { key: "attendeeName", label: "NAME", value: String(data.attendee.name) },
    { key: "eventTime", label: "DATE", value: String(formattedDateTime) },
  ];
  pass.eventTicket.auxiliaryFields = [
    { key: "attendeeEmail", label: "EMAIL", value: String(data.attendee.email) },
    ...(safePhone ? [{ key: "attendeePhone", label: "PHONE", value: safePhone }] : []),
    { key: "joinHint", label: "JOIN", value: "Tap (i) to join" },
  ];
  pass.eventTicket.backFields = [
    {
      key: "joinLive",
      label: "JOIN LIVE",
      value: "Tap to join",
      attributedValue: joinAnchor,
    },
    { key: "serial", label: "SERIAL", value: String(data.serial) },
  ];

  pass.primaryFields.splice(0, pass.primaryFields.length, ...pass.eventTicket.primaryFields);
  pass.secondaryFields.splice(0, pass.secondaryFields.length, ...pass.eventTicket.secondaryFields);
  pass.auxiliaryFields.splice(0, pass.auxiliaryFields.length, ...pass.eventTicket.auxiliaryFields);
  pass.backFields.splice(0, pass.backFields.length, ...pass.eventTicket.backFields);

  pass.addBuffer("icon.png", iconBuffer);
  pass.addBuffer("logo.png", logoBuffer);

  return pass.getAsBuffer();
}

function handleOptions(res) {
  setCors(res);
  return res.status(200).json({ ok: true });
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return handleOptions(res);
  setNoStore(res);

  const secret = process.env.GHL_PASS_SECRET;
  if (!secret) {
    return res.status(500).json({ ok: false, error: "MISSING_GHL_PASS_SECRET" });
  }

  if (req.method === "POST") {
    const baseUrl = getBaseUrl(req);
    if (!baseUrl) {
      return res.status(400).json({ ok: false, error: "MISSING_HOST_HEADER" });
    }

    const body = await readBody(req);
    if (!body || typeof body !== "object") {
      return res.status(400).json({ ok: false, error: "INVALID_JSON_BODY" });
    }

    const attendee = body.attendee && typeof body.attendee === "object" ? body.attendee : {};
    const event = body.event && typeof body.event === "object" ? body.event : {};

    const payload = {
      attendee: {
        name: attendee.name ? String(attendee.name).trim() : "",
        email: attendee.email ? String(attendee.email).trim() : "",
        phone: attendee.phone ? String(attendee.phone).trim() : "",
      },
      event: {
        title: event.title ? String(event.title).trim() : "",
        startsAt: event.startsAt ? String(event.startsAt).trim() : "",
        joinUrl: event.joinUrl ? String(event.joinUrl).trim() : "",
      },
    };

    const errors = [];
    if (!payload.attendee.name) errors.push("attendee.name");
    if (!payload.attendee.email) errors.push("attendee.email");
    if (!payload.event.title) errors.push("event.title");
    if (!payload.event.joinUrl) errors.push("event.joinUrl");
    if (payload.event.joinUrl && !isHttpsUrl(payload.event.joinUrl)) {
      errors.push("event.joinUrl (must start with https://)");
    }
    if (payload.event.startsAt && !formatDateTime(payload.event.startsAt)) {
      errors.push("event.startsAt (invalid datetime)");
    }
    if (errors.length) {
      return res.status(400).json({ ok: false, error: "INVALID_FIELDS", fields: errors });
    }

    const serial = `GHL-${crypto.randomUUID()}`;
    const now = Math.floor(Date.now() / 1000);
    const joinExp = getJoinTokenExp(payload.event.startsAt);
    const passExp = now + PASS_TOKEN_TTL_SECONDS;

    const joinToken = createSignedToken(
      {
        type: "join_redirect",
        joinUrl: payload.event.joinUrl,
        exp: joinExp,
      },
      secret
    );
    const shortJoinUrl = `${baseUrl}/api/join?token=${encodeURIComponent(joinToken)}`;
    if (shortJoinUrl.length > MAX_SHORT_JOIN_URL_LENGTH) {
      return shortUrlTooLongResponse(
        res,
        shortJoinUrl.length,
        payload.event.joinUrl.length
      );
    }

    const passToken = createSignedToken(
      {
        type: "pass_download",
        attendee: payload.attendee,
        event: {
          title: payload.event.title,
          startsAt: payload.event.startsAt || "",
        },
        shortJoinUrl,
        serial,
        exp: passExp,
      },
      secret
    );

    const passUrl = `${baseUrl}/api/ghl-pass?token=${encodeURIComponent(passToken)}`;

    return res.status(200).json({
      ok: true,
      passUrl,
      shortJoinUrl,
      serial,
    });
  }

  if (req.method === "GET") {
    const token = req.query?.token ? String(req.query.token) : "";
    const verified = verifySignedToken(token, secret, "pass_download");
    if (!verified.ok) {
      return res.status(400).json({ ok: false, error: "INVALID_OR_EXPIRED" });
    }

    const payload = verified.payload || {};
    const attendee = payload.attendee && typeof payload.attendee === "object" ? payload.attendee : null;
    const event = payload.event && typeof payload.event === "object" ? payload.event : null;
    const shortJoinUrl = payload.shortJoinUrl ? String(payload.shortJoinUrl) : "";
    const serial = payload.serial ? String(payload.serial) : "";

    if (!attendee || !event || !shortJoinUrl || !serial) {
      return res.status(400).json({ ok: false, error: "INVALID_OR_EXPIRED" });
    }
    if (!attendee.name || !attendee.email || !event.title || !isHttpsUrl(shortJoinUrl)) {
      return res.status(400).json({ ok: false, error: "INVALID_OR_EXPIRED" });
    }
    if (shortJoinUrl.length > MAX_SHORT_JOIN_URL_LENGTH) {
      let joinUrlLength = 0;
      const nestedJoinToken = parseJoinTokenFromShortUrl(shortJoinUrl);
      if (nestedJoinToken) {
        const nestedVerified = verifySignedToken(nestedJoinToken, secret, "join_redirect");
        if (nestedVerified.ok && nestedVerified.payload?.joinUrl) {
          joinUrlLength = String(nestedVerified.payload.joinUrl).length;
        }
      }
      return shortUrlTooLongResponse(res, shortJoinUrl.length, joinUrlLength);
    }

    try {
      const pkpassBuffer = await buildPassBuffer({
        attendee: {
          name: String(attendee.name),
          email: String(attendee.email),
          phone: attendee.phone ? String(attendee.phone) : "",
        },
        event: {
          title: String(event.title),
          startsAt: event.startsAt ? String(event.startsAt) : "",
        },
        shortJoinUrl,
        serial,
      });

      const fileName = `${safeFileName(event.title)}-${safeFileName(serial)}.pkpass`;
      res.setHeader("Content-Type", "application/vnd.apple.pkpass");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      return res.status(200).send(pkpassBuffer);
    } catch (error) {
      const status = Number.isInteger(error?.status) ? error.status : 500;
      return res.status(status).json({
        ok: false,
        error: "PASS_GENERATION_FAILED",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
}
