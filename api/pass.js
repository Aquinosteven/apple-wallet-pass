// api/pass.js
// Generates a working Generic Apple Wallet Pass using passkit-generator on Vercel

import { PKPass } from "passkit-generator";

export default async function handler(req, res) {
  try {
    // ----- ENV VARS -----
    const {
      PASS_P12,
      PASS_P12_PASSWORD,
      WWDR_PEM,
      APPLE_TEAM_ID,
      APPLE_PASS_TYPE_ID,
      APPLE_ORG_NAME,
    } = process.env;

    if (!PASS_P12 || !PASS_P12_PASSWORD || !WWDR_PEM) {
      return res.status(500).json({
        ok: false,
        message: "Missing required certificates (P12, password, WWDR)",
      });
    }

    // ----- DECODE BASE64 CERTIFICATES -----
    const p12Buffer = Buffer.from(PASS_P12, "base64");
    const wwdrBuffer = Buffer.from(WWDR_PEM, "base64");

    // ----- CREATE THE PASS -----
    const pass = new PKPass(
      {
        passTypeIdentifier: APPLE_PASS_TYPE_ID,
        teamIdentifier: APPLE_TEAM_ID,
        organizationName: APPLE_ORG_NAME,
        description: "Generic Wallet Pass",
        serialNumber: "AQUINO-" + Date.now(),
        formatVersion: 1,
        generic: {
          primaryFields: [
            {
              key: "title",
              label: "WELCOME",
              value: "Your Wallet Pass",
            },
          ],
          auxiliaryFields: [
            {
              key: "subtitle",
              label: "Powered By",
              value: "Your Company",
            },
          ],
        },

        // Example barcode
        barcodes: [
          {
            message: "Hello from your API!",
            format: "PKBarcodeFormatQR",
          },
        ],
      },
      {
        wwdr: wwdrBuffer,
        signerCert: p12Buffer,
        signerKeyPassphrase: PASS_P12_PASSWORD,
      }
    );

    // Optional — add your icon images (same image reused here for now)
    // You can replace these with images in /public later
    const placeholder = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgYF41DoAAAAASUVORK5CYII=",
      "base64"
    );

    pass.addBuffer("icon.png", placeholder);
    pass.addBuffer("icon@2x.png", placeholder);
    pass.addBuffer("logo.png", placeholder);

    const pkpassBuffer = await pass.getAsBuffer();

    // ----- RESPONSE -----
    res.setHeader("Content-Type", "application/vnd.apple.pkpass");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="generic-pass.pkpass"'
    );

    return res.status(200).send(pkpassBuffer);
  } catch (err) {
    console.error("PASS GENERATION ERROR:", err);
    return res.status(500).json({
      ok: false,
      message: "Failed to generate pass",
      error: String(err),
    });
  }
}
