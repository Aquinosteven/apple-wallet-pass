// api/pass.js
// Generate a simple "generic" Apple Wallet pass using passkit-generator

import { PKPass } from "passkit-generator";

export default async function handler(req, res) {
  try {
    const {
      WWDR_PEM,
      SIGNER_CERT_PEM,
      SIGNER_KEY_PEM,
      PASS_P12_PASSWORD,
      APPLE_PASS_TYPE_ID,
      APPLE_TEAM_ID,
      APPLE_ORG_NAME,
    } = process.env;

    // 1) Hard guard: if any required env var is missing, bail out early
    const missing = [];
    if (!WWDR_PEM) missing.push("WWDR_PEM");
    if (!SIGNER_CERT_PEM) missing.push("SIGNER_CERT_PEM");
    if (!SIGNER_KEY_PEM) missing.push("SIGNER_KEY_PEM");
    if (!PASS_P12_PASSWORD) missing.push("PASS_P12_PASSWORD");
    if (!APPLE_PASS_TYPE_ID) missing.push("APPLE_PASS_TYPE_ID");
    if (!APPLE_TEAM_ID) missing.push("APPLE_TEAM_ID");
    if (!APPLE_ORG_NAME) missing.push("APPLE_ORG_NAME");

    if (missing.length > 0) {
      return res.status(500).json({
        ok: false,
        message: "Missing one or more required environment variables.",
        missing,
      });
    }

    // 2) Build the certificates object in the shape passkit-generator expects
    const certificates = {
      wwdr: Buffer.from(WWDR_PEM, "base64"),
      signerCert: Buffer.from(SIGNER_CERT_PEM, "base64"),
      signerKey: Buffer.from(SIGNER_KEY_PEM, "base64"),
      signerKeyPassphrase: PASS_P12_PASSWORD,
    };

    // 3) Define a minimal generic pass payload
    const passJSON = {
      formatVersion: 1,
      passTypeIdentifier: APPLE_PASS_TYPE_ID,
      teamIdentifier: APPLE_TEAM_ID,
      organizationName: APPLE_ORG_NAME,
      description: "Test Wallet Pass",
      serialNumber: `SER-${Date.now()}`,

      // "generic" style pass (we can swap to eventTicket/boardingPass later)
      generic: {
        primaryFields: [
          {
            key: "title",
            label: "Demo",
            value: "Demo Wallet Pass",
          },
        ],
        secondaryFields: [
          {
            key: "subtitle",
            label: "Powered by BAD Marketing",
            value: "apple-wallet-pass-six.vercel.app",
          },
        ],
      },

      backgroundColor: "rgb(32,32,32)",
      foregroundColor: "rgb(255,255,255)",
      labelColor: "rgb(255,255,255)",
    };

    // 4) Create the pass (certificates first, then pass JSON)
    const pass = new PKPass(certificates, passJSON);

    // 5) Get the .pkpass buffer and send it as a download
    const pkpassBuffer = pass.getAsBuffer();

    res.setHeader("Content-Type", "application/vnd.apple.pkpass");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="demo-wallet-pass.pkpass"'
    );

    return res.status(200).send(pkpassBuffer);
  } catch (err) {
    console.error("PASS GENERATION ERROR:", err);
    return res.status(500).json({
      ok: false,
      message: "Failed to generate pass",
      error: String(
        err?.message ||
          err ||
          "Unknown error while calling passkit-generator."
      ),
    });
  }
}
