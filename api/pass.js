// api/pass.js
// Simple health-check + env-check endpoint for Vercel

export default async function handler(req, res) {
  try {
    const {
      PASS_P12,
      PASS_P12_PASSWORD,
      WWDR_PEM,
      APPLE_PASS_TYPE_ID,
      APPLE_TEAM_ID,
      APPLE_ORG_NAME,
    } = process.env;

    const missing = [];

    if (!PASS_P12) missing.push("PASS_P12");
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

    // At this point, all env vars are present.
    // We *only* return a JSON success response – no pass generation yet.
    return res.status(200).json({
      ok: true,
      message: "Vercel API route is working ✅",
      envLoaded: {
        PASS_P12: true,
        PASS_P12_PASSWORD: true,
        WWDR_PEM: true,
        APPLE_PASS_TYPE_ID: true,
        APPLE_TEAM_ID: true,
        APPLE_ORG_NAME: true,
      },
    });
  } catch (err) {
    console.error("API /api/pass error:", err);
    return res.status(500).json({
      ok: false,
      message: "Unexpected server error.",
    });
  }
}
