// api/pass.js

// ESM import (works with "type": "module" in package.json)
import { PKPass } from "passkit-generator";

/**
 * Required environment variables (set in Vercel → Settings → Environment Variables)
 *
 * - WWDR_PEM                → Apple WWDR certificate, Base64 of the PEM file
 * - SIGNER_CERT_PEM         → Your pass certificate (developer cert), Base64 of PEM
 * - SIGNER_KEY_PEM          → Your pass private key, Base64 of PEM
 * - SIGNER_KEY_PASSPHRASE   → Password for the private key (string)
 * - APPLE_PASS_TYPE_ID      → e.g. "pass.com.stevenaquino.walletpass"
 * - APPLE_TEAM_ID           → Your 10-char Apple Team ID
 * - APPLE_ORG_NAME          → "BAD Marketing LLC"
 *
 * NOTE: if you previously created PASS_P12 / PASS_P12_PASSWORD etc,
 * you’ll want to regenerate/export the cert + key as PEMs and map them
 * to the variables above.
 */

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ ok: false, message: "Use GET /api/pass" });
    }

    const {
      WWDR_PEM,
      SIGNER_CERT_PEM,
      SIGNER_KEY_PEM,
      SIGNER_KEY_PASSPHRASE,
      APPLE_PASS_TYPE_ID,
      APPLE_TEAM_ID,
      APPLE_ORG_NAME,
    } = process.env;

    // Basic env check so we get a clean JSON error instead of a crash
    if (
      !WWDR_PEM ||
      !SIGNER_CERT_PEM ||
      !SIGNER_KEY_PEM ||
      !SIGNER_KEY_PASSPHRASE ||
      !APPLE_PASS_TYPE_ID ||
      !APPLE_TEAM_ID ||
      !APPLE_ORG_NAME
    ) {
      return res.status(500).json({
        ok: false,
        message: "Missing one or more required environment variables.",
      });
    }

    // Decode Base64 → Buffers (PEM text inside the buffers)
    const wwdr = Buffer.from(WWDR_PEM, "base64");
    const signerCert = Buffer.from(SIGNER_CERT_PEM, "base64");
    const signerKey = Buffer.from(SIGNER_KEY_PEM, "base64");
    const signerKeyPassphrase = SIGNER_KEY_PASSPHRASE;

    // Tiny 1×1 PNG icon (transparent) – enough to make the pass valid
    const iconPngBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jkOcAAAAASUVORK5CYII=";
    const iconBuffer = Buffer.from(iconPngBase64, "base64");

    // Minimal pass.json – you can customize later
    const passJson = {
      formatVersion: 1,
      passTypeIdentifier: APPLE_PASS_TYPE_ID,
      teamIdentifier: APPLE_TEAM_ID,
      organizationName: APPLE_ORG_NAME,
      description: "Demo Wallet Pass",
      generic: {
        primaryFields: [
          {
            key: "title",
            label: APPLE_ORG_NAME,
            value: "Demo Pass",
          },
        ],
      },
      labelColor: "rgb(255,255,255)",
      foregroundColor: "rgb(255,255,255)",
      backgroundColor: "rgb(0,0,0)",
    };

    // Create the PKPass using a buffer model
    const pass = new PKPass(
      {
        "icon.png": iconBuffer,
        "pass.json": Buffer.from(JSON.stringify(passJson)),
      },
      {
        wwdr,
        signerCert,
        signerKey,
        signerKeyPassphrase,
      },
      {
        serialNumber: `demo-${Date.now()}`,
      }
    );

    // Optional: barcode so it looks more “real”
    pass.setBarcodes(String(Date.now()));

    const pkpassBuffer = await pass.getAsBuffer();

    res.setHeader("Content-Type", "application/vnd.apple.pkpass");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="demo-wallet-pass.pkpass"'
    );
    return res.status(200).send(pkpassBuffer);
  } catch (err) {
    console.error("Error generating pass:", err);
    return res.status(500).json({
      ok: false,
      message: "Failed to generate pass",
      error: err?.message || String(err),
    });
  }
}
