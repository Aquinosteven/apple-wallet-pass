// api/pass.js
// Generate a simple generic Apple Wallet pass using passkit-generator on Vercel

import passkitModule from "passkit-generator";

const { PKPass } = passkitModule;

export default async function handler(req, res) {
  try {
    // 1) Load env vars
    const {
      SIGNER_CERT_PEM,
      SIGNER_KEY_PEM,
      PASS_P12_PASSWORD, // we reuse this as the signer key passphrase
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

    if (missing.length > 0) {
      return res.status(500).json({
        ok: false,
        message: "Missing one or more required environment variables.",
        missing,
      });
    }

    // 2) Decode base64-encoded certs/keys from env
    const wwdr = Buffer.from(WWDR_PEM, "base64");
    const signerCert = Buffer.from(SIGNER_CERT_PEM, "base64");
    const signerKey = Buffer.from(SIGNER_KEY_PEM, "base64");
    const signerKeyPassphrase = PASS_P12_PASSWORD;

    // 3) Define a simple in-memory "model" for a generic pass
    const serialNumber = `SER-${Date.now()}`;

    const model = {
      formatVersion: 1,
      passTypeIdentifier: APPLE_PASS_TYPE_ID,
      teamIdentifier: APPLE_TEAM_ID,
      organizationName: APPLE_ORG_NAME,
      description: "Test Wallet Pass",
      serialNumber,
      generic: {
        primaryFields: [
          {
            key: "title",
            label: "Your Ticket",
            value: "Demo Pass",
          },
        ],
        secondaryFields: [
          {
            key: "detail",
            label: "Powered by",
            value: "PassKit + Vercel",
          },
        ],
      },
      backgroundColor: "rgb(32,32,32)",
      foregroundColor: "rgb(255,255,255)",
      labelColor: "rgb(255,255,255)",
    };

    // 4) Create the PKPass instance with certificates + model
    const pass = await PKPass.from({
      model,
      certificates: {
        wwdr,
        signerCert,
        signerKey,
        signerKeyPassphrase,
      },
    });

    // 5) Get the .pkpass file as a Buffer and send it
    const pkpassBuffer = pass.getAsBuffer();

    res.setHeader("Content-Type", "application/vnd.apple.pkpass");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="test-${serialNumber}.pkpass"`
    );

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
