// api/pass.js

import * as passkitModule from "passkit-generator";
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

    if (!WWDR_PEM || !SIGNER_CERT_PEM || !SIGNER_KEY_PEM || !PASS_P12_PASSWORD) {
      return res.status(500).json({
        ok: false,
        message: "Missing certificate env vars",
        have: {
          WWDR_PEM: !!WWDR_PEM,
          SIGNER_CERT_PEM: !!SIGNER_CERT_PEM,
          SIGNER_KEY_PEM: !!SIGNER_KEY_PEM,
          PASS_P12_PASSWORD: !!PASS_P12_PASSWORD,
        },
      });
    }

    const wwdr = Buffer.from(WWDR_PEM, "base64");
    const signerCert = Buffer.from(SIGNER_CERT_PEM, "base64");
    const signerKey = Buffer.from(SIGNER_KEY_PEM, "base64");

    const pass = new PKPass({
      model: "generic",
      certificates: {
        wwdr,
        signerCert,
        signerKey,
        signerKeyPassphrase: PASS_P12_PASSWORD,
      },

      description: "Demo Pass",
      formatVersion: 1,
      organizationName: APPLE_ORG_NAME || "BAD Marketing LLC",
      passTypeIdentifier: APPLE_PASS_TYPE_ID,
      teamIdentifier: APPLE_TEAM_ID,
      serialNumber: "demo-" + Date.now(),

      generic: {
        primaryFields: [
          { key: "title", label: "Demo", value: "Wallet Pass OK" }
        ],
      },
    });

    const buffer = await pass.getAsBuffer();

    res.setHeader("Content-Type", "application/vnd.apple.pkpass");
    res.setHeader("Content-Disposition", "attachment; filename=\"demo.pkpass\"");

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
