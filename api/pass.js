// api/pass.js
// Generate a dynamic Apple Wallet pass using passkit-generator on Vercel
// Reads form fields from req.body and builds the pass accordingly.

import * as passkitModule from "passkit-generator";
const { PKPass } = passkitModule;

export default async function handler(req, res) {
  // --- CORS SETUP ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // 1) Load env vars
    const {
      SIGNER_CERT_PEM,
      SIGNER_KEY_PEM,
      PASS_P12_PASSWORD,
      WWDR_PEM,
      APPLE_PASS_TYPE_ID,
      APPLE_TEAM_ID,
      APPLE_ORG_NAME,
    } = process.env;

    const missing = [];
    if (!SIGNER_CERT_PEM) missing.push("SIGNER_CERT_PEM");
    if (!SIGNER_KEY_PEM) missing.push("SIGNER_KEY_PEM");
    if (!PASS_P12_PASSWORD) missing.push("PASS_P12_PASSWORD");
    if (!WWDR_PEM) missing.push("WWDR_PEM");
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

    // 2) Read form fields from request body
    const {
      name = "Guest",
      eventName = "Event",
      ticketType = "General Admission",
      seat = "Unassigned",
      barcodeValue,
    } = req.body || {};

    // 3) Decode base64-encoded certs/keys from env
    const wwdr = Buffer.from(WWDR_PEM, "base64");
    const signerCert = Buffer.from(SIGNER_CERT_PEM, "base64");
    const signerKey = Buffer.from(SIGNER_KEY_PEM, "base64");
    const signerKeyPassphrase = PASS_P12_PASSWORD;

    // 4) Generate a serial number
    const serialNumber = `SER-${Date.now()}`;

    // 5) Generate barcode value (use provided or auto-generate)
    const barcode = barcodeValue || `AUTO-${Date.now()}`;

    // 6) Create the PKPass instance
    const pass = await PKPass.from(
      {
        model: "generic",
        certificates: {
          wwdr,
          signerCert,
          signerKey,
          signerKeyPassphrase,
        },
      },
      {
        formatVersion: 1,
        passTypeIdentifier: APPLE_PASS_TYPE_ID,
        teamIdentifier: APPLE_TEAM_ID,
        organizationName: APPLE_ORG_NAME,
        description: eventName,
        serialNumber,
        generic: {
          primaryFields: [
            { key: "event", label: "Event", value: eventName },
          ],
          secondaryFields: [
            { key: "name", label: "Name", value: name },
            { key: "ticketType", label: "Ticket Type", value: ticketType },
            { key: "seat", label: "Seat", value: seat },
          ],
        },
        barcode: {
          message: barcode,
          format: "PKBarcodeFormatQR",
          messageEncoding: "iso-8859-1",
        },
        barcodes: [
          {
            message: barcode,
            format: "PKBarcodeFormatQR",
            messageEncoding: "iso-8859-1",
          },
        ],
        backgroundColor: "rgb(32,32,32)",
        foregroundColor: "rgb(255,255,255)",
        labelColor: "rgb(255,255,255)",
      }
    );

    // 7) Get the .pkpass file as a Buffer and send it
    const pkpassBuffer = pass.getAsBuffer();
    res.setHeader("Content-Type", "application/vnd.apple.pkpass");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${eventName.replace(/\s+/g, "-")}-${serialNumber}.pkpass"`
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
