// api/pass.js
// Dynamic DEBUG Apple Wallet pass using PKPass.from + CORS

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

    const wwdr = Buffer.from(WWDR_PEM, "base64");
    const signerCert = Buffer.from(SIGNER_CERT_PEM, "base64");
    const signerKey = Buffer.from(SIGNER_KEY_PEM, "base64");

    // Defaults + POST body
    let name = "Guest";
    let eventName = "DEBUG EVENT";
    let ticketType = "General Admission";
    let seat = "Unassigned";
    let barcodeValue;

    if (req.method === "POST" && req.body) {
      name = req.body.name || name;
      eventName = req.body.eventName || eventName;
      ticketType = req.body.ticketType || ticketType;
      seat = req.body.seat || seat;
      barcodeValue = req.body.barcodeValue || barcodeValue;
    }

    const serialNumber = `SER-${Date.now()}`;
    const barcodeMessage = barcodeValue || serialNumber;

    // DEBUG: obvious colors & labels so we KNOW this code is running
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
        organizationName: APPLE_ORG_NAME || "Dynamic Debug Org",
        description: "DYNAMIC DEBUG PASS",
        serialNumber,
        generic: {
          primaryFields: [
            { key: "event", label: "ZZ_EVENT", value: eventName },
          ],
          secondaryFields: [
            { key: "name", label: "ZZ_NAME", value: name },
            { key: "ticketType", label: "ZZ_TICKET_TYPE", value: ticketType },
            { key: "seat", label: "ZZ_SEAT", value: seat },
          ],
        },
        backgroundColor: "rgb(0,0,255)",     // bright blue
        foregroundColor: "rgb(255,255,0)",   // yellow text
        labelColor: "rgb(255,0,0)",          // red labels
        barcode: {
          message: barcodeMessage,
          format: "PKBarcodeFormatQR",
          messageEncoding: "iso-8859-1",
        },
      }
    );

    const buffer = pass.getAsBuffer();
    res.setHeader("Content-Type", "application/vnd.apple.pkpass");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="debug-${eventName.replace(/\s+/g, "-")}-${serialNumber}.pkpass"`
    );
    return res.status(200).send(buffer);

  } catch (err) {
    console.error("Pass error:", err);
    return res.status(500).json({ error: err.message || "Pass generation failed" });
  }
}
