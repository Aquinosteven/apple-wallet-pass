// api/pass.js
// Your working Apple Wallet pass generation endpoint
// Now includes full CORS support so your frontend on a different domain can call it.

import fs from "fs"
import path from "path"
import Passkit from "passkit-generator"

export default async function handler(req, res) {
  //
  // ---------------------------
  // 🟢 CORS SETUP (required)
  // ---------------------------
  //
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  //
  // ---------------------------
  // 🟢 Only allow POST
  // ---------------------------
  //
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    //
    // ---------------------------
    // 🟢 Parse request body
    // ---------------------------
    //
    const {
      name,
      email,
      eventName,
      ticketType,
      seat,
      barcodeValue
    } = req.body || {}

    // Basic validation
    if (!name || !eventName) {
      return res.status(400).json({ error: "Missing required fields" })
    }

    //
    // ---------------------------
    // 🟢 Load certificates
    // ---------------------------
    //
    const p12 = Buffer.from(process.env.PASS_P12, "base64")
    const wwdrPem = Buffer.from(process.env.WWDR_PEM, "base64").toString("utf8")

    //
    // ---------------------------
    // 🟢 Setup pass generator
    // ---------------------------
    //
    const modelPath = path.join(process.cwd(), "generic.pass")
    const pass = await Passkit.createPass({
      model: modelPath,
      certificates: {
        wwdr: wwdrPem,
        signerCert: p12,
        signerKey: p12,
        signerKeyPassphrase: process.env.PASS_P12_PASSWORD
      }
    })

    //
    // ---------------------------
    // 🟢 Build pass contents
    // ---------------------------
    //
    pass.headerFields.add("event", eventName)
    pass.secondaryFields.add("name", name)
    pass.secondaryFields.add("ticketType", ticketType || "General Admission")
    pass.secondaryFields.add("seat", seat || "Unassigned")

    const barcode = barcodeValue || `AUTO-${Date.now()}`
    pass.barcodes.push({
      message: barcode,
      format: "PKBarcodeFormatQR",
      messageEncoding: "iso-8859-1"
    })

    //
    // ---------------------------
    // 🟢 Generate the pass
    // ---------------------------
    //
    const buffer = await pass.asBuffer()

    res.setHeader("Content-Type", "application/vnd.apple.pkpass")
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${eventName.replace(/\s+/g, "-")}.pkpass"`
    )
    return res.status(200).send(buffer)
  } catch (error) {
    console.error("Pass generation error:", error)
    return res.status(500).json({
      error: "Pass generation failed",
      details: error?.message || String(error)
    })
  }
}
