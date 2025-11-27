// api/pass.js
// Generate a simple "generic" Apple Wallet pass

import PKPass from "passkit-generator";

export default async function handler(req, res) {
  try {
    const {
      WWDR_PEM,
      SIGNER_CERT_PEM,
      SIGNER_KEY_PEM,
      APPLE_PASS_TYPE_ID,
      APPLE_TEAM_ID,
      APPLE_ORG_NAME,
    } = process.env;

    const missing = [];
    if (!WWDR_PEM) missing.push("WWDR_PEM");
    if (!SIGNER_CERT_PEM) missing.push("SIGNER_CERT_PEM");
    if (!SIGNER_KEY_PEM) missing.push("SIGNER_KEY_PEM");
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

    // Decode the Base64-encoded certificates/keys
    const wwdrCertificate = Buffer.from(WWDR_PEM, "base64");
    const signerCert = Buffer.from(SIGNER_CERT_PEM, "base64");
    const signerKey = Buffer.from(SIGNER_KEY_PEM, "base64");

    // Create a very simple generic pass
    const pass = await PKPass.from({
      model: "generic", // simple built-in model
      certificates: {
        wwdr: wwdrCertificate,
        signerCert,
        signerKey,
        // signerKeyPassphrase is NOT needed because signerKey.pem is already decrypted
      },
      // Basic pass metadata
      passTypeIdentifier: APPLE_PASS_TYPE_ID,
      teamIdentifier: APPLE_TEAM_ID,
      organizationName: APPLE_ORG_NAME,
      description: "Test Generic Pass",
      serialNumber: Date.now().toString(),
      logoText: "Demo Pass",
      foregroundColor: "rgb(255, 255, 255)",
      backgroundColor: "rgb(0, 122, 255)", // iOS blue
      generic: {
        primaryFields: [
          {
            key: "title",
            label: "Demo",
            value: "Sample Generic Pass",
          },
        ],
      },
    });

    // Get the pass as a Buffer and return it
    const pkpassBuffer = await pass.getAsBuffer();

    res.setHeader("Content-Type", "application/vnd.apple.pkpass");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=\"demo.pkpass\""
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
