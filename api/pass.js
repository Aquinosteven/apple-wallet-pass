// api/pass.js
import { Pass } from "passkit-generator";

export default async function handler(req, res) {
  try {
    const {
      PASS_P12,
      PASS_P12_PASSWORD,
      WWDR_PEM,
      APPLE_PASS_TYPE_ID,
      APPLE_TEAM_ID,
      APPLE_ORG_NAME
    } = process.env;

    if (!PASS_P12 || !PASS_P12_PASSWORD || !WWDR_PEM) {
      return res.status(500).json({
        ok: false,
        message: "Missing certificate env variables",
      });
    }

    // Decode Base64 certificates
    const passCertificate = Buffer.from(PASS_P12, "base64");
    const wwdrCertificate = Buffer.from(WWDR_PEM, "base64");

    // Create a boarding pass template (simple test)
    const pass = await Pass.from({
      model: "generic", // default test model
      certificates: {
        wwdr: wwdrCertificate,
        signerCert: passCertificate,
        signerKey: passCertificate,
        signerKeyPassphrase: PASS_P12_PASSWORD,
      },
    });

    pass.headerFields.push({
      key: "header",
      label: "Demo",
      value: "Wallet Pass Working!",
    });

    // Finalize & send
    const stream = pass.getAsStream();
    res.setHeader("Content-Type", "application/vnd.apple.pkpass");
    res.setHeader("Content-Disposition", "attachment; filename=demo.pkpass");

    stream.pipe(res);
  } catch (err) {
    console.error("Pass generation error:", err);
    res.status(500).json({ ok: false, error: err.toString() });
  }
}
