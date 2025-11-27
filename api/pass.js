// api/pass.js

import Passkit from "passkit-generator";
const { Pass } = Passkit;

export default async function handler(req, res) {
  try {
    const {
      PASS_P12,
      PASS_P12_PASSWORD,
      WWDR_PEM,
      APPLE_PASS_TYPE_ID,
      APPLE_TEAM_ID,
      APPLE_ORG_NAME,
    } = process.env;

    if (!PASS_P12 || !PASS_P12_PASSWORD || !WWDR_PEM) {
      return res.status(500).json({
        ok: false,
        message: "Missing certificate env variables",
      });
    }

    // Decode Base64 certificates
    const passCertificate = Buffer.from(PASS_P12, "base64");
    const wwdrcert = Buffer.from(WWDR_PEM, "base64");

    // Create pass instance
    const pass = await Pass.create({
      model: "generic",
      certificates: {
        wwdr: wwdrcert,
        signerCert: passCertificate,
        signerKey: passCertificate,
        signerKeyPassphrase: PASS_P12_PASSWORD,
      },
    });

    const file = await pass.asBuffer();

    res.setHeader("Content-Type", "application/vnd.apple.pkpass");
    res.setHeader("Content-Disposition", "attachment; filename=pass.pkpass");
    return res.send(file);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      message: "Failed to generate pass",
      error: err.toString(),
    });
  }
}
