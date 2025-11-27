// api/pass.js
// Generate a simple generic .pkpass using passkit-generator on Vercel

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

    // Basic env sanity check (these are the base64 strings you pasted)
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
        message:
          "Missing one or more required environment variables for pass generation.",
        missing,
      });
    }

    // --- Certificates: decode base64 into Buffers ---
    const certificates = {
      wwdr: Buffer.from(WWDR_PEM, "base64"),
      signerCert: Buffer.from(SIGNER_CERT_PEM, "base64"),
      signerKey: Buffer.from(SIGNER_KEY_PEM, "base64"),
      signerKeyPassphrase: PASS_P12_PASSWORD,
    };

    // --- Minimal generic pass definition ---
    const now = Date.now().toString();

    const passDefinition = {
      formatVersion: 1,
      passTypeIdentifier: APPLE_PASS_TYPE_ID,
      teamIdentifier: APPLE_TEAM_ID,
      organizationName: APPLE_ORG_NAME,
      description: "Test Wallet Pass",
      serialNumber: `SER-${now}`,
      logoText: "Test Wallet Pass",

      generic: {
        primaryFields: [
          {
            key: "title",
            label: "Ticket",
            value: "Demo Pass",
          },
        ],
        secondaryFields: [
          {
            key: "subtitle",
            label: "Issued",
            value: new Date().toISOString().substring(0, 10),
          },
        ],
      },

      backgroundColor: "rgb(32,32,32)",
      foregroundColor: "rgb(255,255,255)",
      labelColor: "rgb(255,255,255)",

      // 🔴 IMPORTANT: certificates must be passed here
      certificates,
    };

    // --- Build pass in memory ---
    const pass = new PKPass(passDefinition);

    const pkpassBuffer = await pass.generate();

    // --- Send .pkpass file back ---
    res.setHeader("Content-Type", "application/vnd.apple.pkpass");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="test-wallet-pass.pkpass"'
    );

    return res.status(200).send(pkpassBuffer);
  } catch (err) {
    console.error("PASS GENERATION ERROR:", err);

    return res.status(500).json({
      ok: false,
      message: "Failed to generate pass",
      error: String(err?.message || err),
    });
  }
}
