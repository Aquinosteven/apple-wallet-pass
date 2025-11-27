// api/pass.js

import { Pass } from "passkit-generator";

export default async function handler(req, res) {
  try {
    // 1) Read env vars
    const {
      PASS_P12,
      PASS_P12_PASSWORD,
      WWDR_PEM,
      APPLE_PASS_TYPE_ID,
      APPLE_TEAM_ID,
      APPLE_ORG_NAME,
    } = process.env;

    // 2) Check that they are all present – and TELL US which ones are missing
    const present = {
      PASS_P12: !!PASS_P12,
      PASS_P12_PASSWORD: !!PASS_P12_PASSWORD,
      WWDR_PEM: !!WWDR_PEM,
      APPLE_PASS_TYPE_ID: !!APPLE_PASS_TYPE_ID,
      APPLE_TEAM_ID: !!APPLE_TEAM_ID,
      APPLE_ORG_NAME: !!APPLE_ORG_NAME,
    };

    const allPresent = Object.values(present).every(Boolean);

    if (!allPresent) {
      return res.status(500).json({
        ok: false,
        message: "Missing one or more required environment variables.",
        present,
      });
    }

    // 3) Decode base64 certificates
    const signerP12 = Buffer.from(PASS_P12, "base64");
    const wwdrCert = Buffer.from(WWDR_PEM, "base64");

    // 4) Build a very simple test pass
    const pass = await Pass.from({
      model: "generic",
      certificates: {
        wwdr: wwdrCert,
        signerCert: signerP12,
        signerKey: signerP12, // p12 contains cert+key
        signerKeyPassphrase: PASS_P12_PASSWORD,
      },
      organizationName: APPLE_ORG_NAME,
      passTypeIdentifier: APPLE_PASS_TYPE_ID,
      teamIdentifier: APPLE_TEAM_ID,
      serialNumber: `test-${Date.now()}`,
      description: "Test pass from Vercel",
      foregroundColor: "rgb(255,255,255)",
      backgroundColor: "rgb(0,0,0)",
      labelColor: "rgb(255,255,255)",
      barcodes: [
        {
          format: "PKBarcodeFormatQR",
          message: "Hello from Vercel",
          messageEncoding: "iso-8859-1",
        },
      ],
    });

    const buffer = await pass.asBuffer();

    res.setHeader("Content-Type", "application/vnd.apple.pkpass");
    res.setHeader("Content-Disposition", 'attachment; filename="test.pkpass"');
    return res.status(200).send(buffer);
  } catch (err) {
    console.error("Error generating pass:", err);
    return res.status(500).json({
      ok: false,
      message: "Server error generating pass",
      error: err.message,
    });
  }
}
