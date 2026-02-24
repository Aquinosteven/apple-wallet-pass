import * as passkitModule from "passkit-generator";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const { PKPass } = passkitModule;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

function getSigningConfig() {
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
    const error = new Error("Missing required environment variables");
    error.missing = missing;
    throw error;
  }

  return {
    wwdr: Buffer.from(WWDR_PEM, "base64"),
    signerCert: Buffer.from(SIGNER_CERT_PEM, "base64"),
    signerKey: Buffer.from(SIGNER_KEY_PEM, "base64"),
    signerKeyPassphrase: PASS_P12_PASSWORD,
    passTypeIdentifier: APPLE_PASS_TYPE_ID,
    teamIdentifier: APPLE_TEAM_ID,
    organizationName: APPLE_ORG_NAME,
  };
}

export async function generateApplePass(options) {
  const {
    attendeeName,
    attendeeEmail,
    attendeePhone,
    eventTitle,
    startsAt,
    joinUrl,
    serialNumber,
    backgroundColor = "rgb(32,32,32)",
    foregroundColor = "rgb(255,255,255)",
    labelColor = "rgb(255,255,255)",
    logoBuffer = null,
    stripBuffer = null,
  } = options || {};

  const signing = getSigningConfig();
  const formattedDateTime = formatDateTime(startsAt) || String(startsAt || "");
  const safeEventTitle = String(eventTitle || "ShowFi Event");
  const safeAttendeeName = String(attendeeName || "Guest");
  const safeAttendeeEmail = String(attendeeEmail || "");
  const safePhone = attendeePhone ? String(attendeePhone) : "";
  const safeSerial = String(serialNumber || "");

  const pass = await PKPass.from(
    {
      model: join(__dirname, "..", "event-ticket.pass"),
      certificates: {
        wwdr: signing.wwdr,
        signerCert: signing.signerCert,
        signerKey: signing.signerKey,
        signerKeyPassphrase: signing.signerKeyPassphrase,
      },
    },
    {
      formatVersion: 1,
      passTypeIdentifier: signing.passTypeIdentifier,
      teamIdentifier: signing.teamIdentifier,
      organizationName: signing.organizationName,
      description: `${safeEventTitle} Ticket`,
      serialNumber: safeSerial,
      backgroundColor,
      foregroundColor,
      labelColor,
    }
  );

  pass.eventTicket = pass.eventTicket || {};
  pass.eventTicket.primaryFields = [
    { key: "eventTitle", label: "EVENT", value: safeEventTitle },
  ];

  pass.eventTicket.secondaryFields = [
    { key: "attendeeName", label: "NAME", value: safeAttendeeName },
    { key: "eventTime", label: "DATE", value: formattedDateTime },
  ];

  pass.eventTicket.auxiliaryFields = [
    { key: "attendeeEmail", label: "EMAIL", value: safeAttendeeEmail },
    ...(safePhone ? [{ key: "attendeePhone", label: "PHONE", value: safePhone }] : []),
  ];

  pass.eventTicket.backFields = [
    ...(joinUrl ? [{ key: "joinUrl", label: "JOIN LINK", value: String(joinUrl) }] : []),
    { key: "serial", label: "SERIAL", value: safeSerial },
  ];

  pass.primaryFields.splice(0, pass.primaryFields.length, ...pass.eventTicket.primaryFields);
  pass.secondaryFields.splice(0, pass.secondaryFields.length, ...pass.eventTicket.secondaryFields);
  pass.auxiliaryFields.splice(0, pass.auxiliaryFields.length, ...pass.eventTicket.auxiliaryFields);
  pass.backFields.splice(0, pass.backFields.length, ...pass.eventTicket.backFields);

  if (logoBuffer) {
    pass.addBuffer("icon.png", logoBuffer);
    pass.addBuffer("logo.png", logoBuffer);
  }
  if (stripBuffer) {
    pass.addBuffer("strip.png", stripBuffer);
  }

  const pkpassBuffer = pass.getAsBuffer();
  const filename = `${safeFileName(safeEventTitle)}-ticket-${safeSerial}.pkpass`;
  return { pkpassBuffer, filename };
}
