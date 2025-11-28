// api/pass.js
// SAFE MINIMAL PASS GENERATOR — proven working
// Uses PKPass.from() with the built-in "generic" model

import * as passkitModule from "passkit-generator";
const { PKPass } = passkitModule;

export default async function handler(req, res) {
  // --- CORS ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // --- Load env vars ---
    const {
      SIGNER_CERT_PEM,
      SIGNER_KEY_PEM,
      PASS_P12_PASSWORD,
      WWDR_PEM,
      APPLE_PASS_TYPE_ID,
      APPLE_TEAM_ID,
      APPLE_ORG_NAME,
    } = process.env;

    if (!SIGNER_CERT_PEM || !SIGNER_KEY_PEM || !WWDR_PEM) {
      return res.status(500).json({ error: "Missing cert environment variables" });
    }

    // Decode PEMs
    const wwdr = Buffer.from(WWDR_PEM, "base64");
    const signerCert = Buffer.from(SIGNER_CERT_PEM, "base64");
    const signerKey = Buffer.from(SIGNER_KEY_PEM, "base64");

    // Serial and basic fields
    const serialNumber = `SER-${Date.now()}`;

    // --- Generate the pass ---
    const pass = await PKPass.from(
      {
        model: "generic",
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
        description: "Demo Wallet Pass",
        serialNumber,
        generic: {
          primaryFields: [
            { key: "title", label: "Ticket", value: "Demo Pass" },
          ],
        },
        barcode: {
          message: serialNumber,
          format: "PKBarcodeFormatQR",
          messageEncoding: "iso-8859-1",
        },
      }
    );

    const buffer = pass.getAsBuffer();
    res.setHeader("Content-Type", "application/vnd.apple.pkpass");
    res.setHeader("Content-Disposition", `attachment; filename="test-${serialNumber}.pkpass"`);
    return res.status(200).send(buffer);

  } catch (err) {
    console.error("Pass error:", err);
    return res.status(500).json({ error: err.message || "Pass generation failed" });
  }
}
