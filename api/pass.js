// api/pass.js
// Stable, serverless-safe Apple Wallet pass generator for Vercel

import * as passkit from "passkit-generator";
const { PKPass } = passkit;

export default async function handler(req, res) {
  // ---- CORS (temporary permissive) ----
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

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

    const wwdr = Buffer.from(WWDR_PEM, "base64");
    const signerCert = Buffer.from(SIGNER_CERT_PEM, "base64");
    const signerKey = Buffer.from(SIGNER_KEY_PEM, "base64");

    const serialNumber = `SER-${Date.now()}`;

    const pass = await PKPass.from(
      {
        // INLINE MODEL — no filesystem, no templates
        model: {
          formatVersion: 1,
          passTypeIdentifier: APPLE_PASS_TYPE_ID,
          teamIdentifier: APPLE_TEAM_ID,
          organizationName: APPLE_ORG_NAME,
          description: "AttendOS Test Pass",
          serialNumber,

          generic: {
            primaryFields: [
              { key: "event", label: "Event", value: "Demo Event" },
            ],
            secondaryFields: [
              { key: "powered", label: "Powered by", value: "AttendOS" },
            ],
          },

          backgroundColor: "rgb(32,32,32)",
          foregroundColor: "rgb(255,255,255)",
          labelColor: "rgb(255,255,255)",
        },

        certificates: {
          wwdr,
          signerCert,
          signerKey,
          signerKeyPassphrase: PASS_P12_PASSWORD,
        },
      }
    );

    const buffer = pass.getAsBuffer();

    res.setHeader("Content-Type", "application/vnd.apple.pkpass");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="test-${serialNumber}.pkpass"`
    );

    return res.status(200).send(buffer);
  } catch (err) {
    console.error("PASS GENERATION ERROR:", err);
    return res.status(500).json({
      ok: false,
      message: "Failed to generate pass",
      error: err?.message || String(err),
    });
  }
}
