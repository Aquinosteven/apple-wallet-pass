// api/passkit-test.js
// Verify that `passkit-generator` can be imported on Vercel.

export default async function handler(req, res) {
  try {
    // Dynamically import the CommonJS module
    const mod = await import("passkit-generator");

    // Handle different export styles just in case
    const Pass = mod.default || mod.Pass || mod;

    const info = {
      imported: !!Pass,
      typeofDefault: typeof mod.default,
      typeofPassNamed: typeof mod.Pass,
      keys: Object.keys(mod),
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
