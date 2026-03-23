// api/passkit-test.js
// Verify that `passkit-generator` can be imported on Vercel.

import * as Passkit from "passkit-generator";

// Try to find PKPass in a way that works for CJS or ESM builds
const PKPass =
  Passkit.PKPass ||        // named export
  Passkit.default ||       // default export
  Passkit;                 // fallback (module itself)

export default async function handler(req, res) {
  try {
    const info = {
      imported: !!PKPass,
      typeOfModule: typeof Passkit,
      typeOfPKPass: typeof PKPass,
      moduleKeys: Object.keys(Passkit || {}),
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
