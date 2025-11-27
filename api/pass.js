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

    res.status(200).json({
      ok: true,
      message: 'Vercel API route is working ✅',
      envLoaded: {
        PASS_P12: !!PASS_P12,
        PASS_P12_PASSWORD: !!PASS_P12_PASSWORD,
        WWDR_PEM: !!WWDR_PEM,
        APPLE_PASS_TYPE_ID: !!APPLE_PASS_TYPE_ID,
        APPLE_TEAM_ID: !!APPLE_TEAM_ID,
        APPLE_ORG_NAME: !!APPLE_ORG_NAME,
      },
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ ok: false, error: err?.message || 'Unknown error in /api/pass' });
  }
}
