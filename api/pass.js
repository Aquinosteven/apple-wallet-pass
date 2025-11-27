// api/pass.js

import passkitModule from "passkit-generator";

const { PKPass } = passkitModule;

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

    // Quick sanity check so we don't go crazy later
    if (!WWDR_PEM || !SIGNER_CERT_PEM || !SIGNER_KEY_PEM || !PASS_P12_PASSWORD) {
      return res.status(500).json({
        ok: false,
        message: "Missing one or more certificate env vars",
        have: {
          WWDR_PEM: !!WWDR_PEM,
          SIGNER_CERT_PEM: !!SIGNER_CERT_PEM,
          SIGNER_KEY_PEM: !!SIGNER_KEY_PEM,
          PASS_P12_PASSWORD: !!PASS_P12_PASSWORD,
        },
      });
    }

    // Decode Base64 → Buffers
    const wwdr = Buffer.from(WWDR_PEM, "base64");
    const signerCert = Buffer.from(SIGNER_CERT_PEM, "base64");
    const signerKey = Buffer.from(SIGNER_KEY_PEM, "base64");

    // Build a very simple generic pass
    const pass = new PKPass({
      model: "generic",
      certificates: {
        wwdr,
        signerCert,
        signerKey, // 👈 THIS is what was missing
        signerKeyPassphrase: PASS_P12_PASSWORD,
      },

      // Required top-level fields
      description: "Demo generic pass",
      formatVersion: 1,
      organizationName: APPLE_ORG_NAME || "BAD Marketing LLC",
      passTypeIdentifier: APPLE_PASS_TYPE_ID,
      teamIdentifier: APPLE_TEAM_ID,
      serialNumber: "demo-" + Date.now(),

      // Minimal generic content
      generic: {
        primaryFields: [
          {
            key: "title",
            label: "Demo",
            value: "Wallet Pass OK",
          },
        ],
        secondaryFields: [
          {
            key: "timestamp",
            label: "Generated",
            value: new Date().toISOString(),
          },
        ],
      },
    });

    // Get .pkpass as a Buffer and send it
    const buffer = await pass.getAsBuffer();

    res.setHeader("Content-Type", "application/vnd.apple.pkpass");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="demo-pass.pkpass"'
    );

    return res.status(200).send(buffer);
  } catch (err) {
    console.error("PASS GENERATION ERROR:", err);

    return res.status(500).json({
      ok: false,
      message: "Failed to generate pass",
      error: String(err?.message || err),
    });
  }
}
