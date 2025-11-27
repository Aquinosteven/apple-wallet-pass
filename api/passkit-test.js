// api/passkit-test.js
import PKPass from "passkit-generator";

export default async function handler(req, res) {
  try {
    const info = {
      imported: !!PKPass,
      type: typeof PKPass,
      name: PKPass?.name,
      keys: Object.keys(PKPass || {}),
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
