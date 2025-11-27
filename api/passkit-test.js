// api/passkit-test.js
// Verify that `passkit-generator` can be imported on Vercel.

import Pass from "passkit-generator";

export default async function handler(req, res) {
  try {
    const info = {
      imported: !!Pass,
      type: typeof Pass,
      name: Pass?.name,
    };

    return res.status(200).json({
      ok: true,
      message: "passkit-generator import looks good ✅",
      info,
    });
  } catch (err) {
    console.error("API /api/passkit-test error:", err);

    return res.status(500).json({
      ok: false,
      message: "Failed to import passkit-generator",
      error: err?.message || String(err),
    });
  }
}
