// src/api/pass.js
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

    // 1) Basic env-var check (keeps debugging sane)
    const missing = [];
    if (!WWDR_PEM) missing.push("WWDR_PEM");
    if (!SIGNER_CERT_PEM) missing.push("SIGNER_CERT_PEM");
    if (!SIGNER_KEY_PEM) missing.push("SIGNER_KEY_PEM");
    if (!PASS_P12_PASSWORD) missing.push("PASS_P12_PASSWORD");
    if (!APPLE_PASS_TYPE_ID) missing.push("APPLE_PASS_TYPE_ID");
    if (!APPLE_TEAM_ID) missing.push("APPLE_TEAM_ID");
    if (!APPLE_ORG_NAME) missing.push("APPLE_ORG_NAME");

    if (missing.length) {
      return res.status(500).json({
        ok: false,
        message: "Missing one or more required environment variables.",
        missing,
      });
    }

    // 2) Decode certs from base64 env vars → Buffers
    const certificates = {
      wwdr: Buffer.from(WWDR_PEM, "base64"),
      signerCert: Buffer.from(SIGNER_CERT_PEM, "base64"),
      signerKey: Buffer.from(SIGNER_KEY_PEM, "base64"),
      signerKeyPassphrase: PASS_P12_PASSWORD,
    };

    // 3) Define a minimal *generic* pass body
    const passBody = {
      description: "Demo generic pass",
      formatVersion: 1,
      organizationName: APPLE_ORG_NAME,
      passTypeIdentifier: APPLE_PASS_TYPE_ID,
      teamIdentifier: APPLE_TEAM_ID,
      serialNumber: `demo-${Date.now()}`, // unique id
      logoText: "Demo Pass",
      foregroundColor: "rgb(255,255,255)",
      backgroundColor: "rgb(0,0,0)",
      labelColor: "rgb(255,255,255)",

      // This `generic` block is what gives the pass its *type*
      generic: {
        primaryFields: [
          {
            key: "title",
            label: "EVENT",
            value: "Demo Event",
          },
        ],
        secondaryFields: [
          {
            key: "subtitle",
            label: "TICKET",
            value: "Demo ticket",
          },
        ],
      },
    };

    // 4) Create the PKPass instance
    const pass = new PKPass(
      {
        // logical model name – keeps passkit-generator happy
        model: "generic",
        certificates,
      },
      passBody
    );

    // 5) Render and stream the .pkpass file to the browser
    const stream = await pass.render();

    res.setHeader("Content-Type", "application/vnd.apple.pkpass");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="demo.pkpass"'
    );

    stream.pipe(res);
  } catch (err) {
    console.error("PASS GENERATION ERROR:", err);
    return res.status(500).json({
      ok: false,
      message: "Failed to generate pass",
      error: err?.message || String(err),
    });
  }
}
