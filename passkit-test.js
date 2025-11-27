// api/passkit-test.js
// Simple endpoint to verify that `passkit-generator` can be imported on Vercel.

import passkit from "passkit-generator";

export default async function handler(req, res) {
  try {
    const info = {
      hasDefault: !!passkit,
      keys: Object.keys(passkit || {}),
      passType: typeof (passkit && passkit.Pass),
    };

    return res.status(200).json({
      ok: true,
      message: "Imported passkit-generator successfully (or at least Node thinks so) ✅",
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
