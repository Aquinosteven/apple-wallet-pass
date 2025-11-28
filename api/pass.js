// api/pass.js
// Dynamic Apple Wallet pass using passkit-generator's built-in "generic" model
// Uses form fields on POST and safe defaults on GET. Includes CORS for v0 frontend.

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
    // Env vars (same ones that worked for the original Demo Pass)
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

    // --- Read fields from body, with defaults so GET still works ---
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

    const wwdr = Buffer.from(WWDR_PEM, "base64");
    const signerCert = Buffer.from(SIGNER_CERT_PEM, "base64");
    const signerKey = Buffer.from(SIGNER_KEY_PEM, "base64");
    const signerKeyPassphrase = PASS_P12_PASSWORD;

    const serialNumber = `SER-${Date.now()}`;
    const barcode = barcodeValue || serialNumber;

    // --- This is the ORIGINAL working pattern, just with dynamic values ---
    const pass = await PKPass.from(
      {
        // ✅ Use the built-in "generic" model (this is what produced Demo Pass originally)
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
        description: `DYNAMIC: ${eventName}`,
        serialNumber,
        generic: {
          // 👇 This is the big front-of-card text that used to be "Demo Pass"
          primaryFields: [
            { key: "title", label: "Ticket", value: eventName },
          ],
          secondaryFields: [
            { key: "name", label: "Name", value: name },
            { key: "ticketType", label: "Ticket Type", value: ticketType },
            { key: "seat", label: "Seat", value: seat },
          ],
        },
        // Loud colors so we can keep visually debugging
        backgroundColor: "rgb(0,0,255)",     // blue
        foregroundColor: "rgb(255,255,0)",   // yellow text
        labelColor: "rgb(255,0,0)",          // red labels
        barcode: {
          message: barcode,
          format: "PKBarcodeFormatQR",
          messageEncoding: "iso-8859-1",
        },
      }
    );

    const pkpassBuffer = pass.getAsBuffer();
    res.setHeader("Content-Type", "application/vnd.apple.pkpass");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="debug-${eventName.replace(/\s+/g, "-")}-${serialNumber}.pkpass"`
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
