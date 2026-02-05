import fs from "fs";
import path from "path";

const REQUIRED_ENV_VARS = [
  "APPLE_PASS_TYPE_IDENTIFIER",
  "APPLE_TEAM_IDENTIFIER",
  "APPLE_KEY_IDENTIFIER",
  "APPLE_PRIVATE_KEY",
  "APPLE_WWDR_CERT",
];

function getTemplates() {
  const passesDir = path.join(process.cwd(), "passes");
  try {
    const entries = fs.readdirSync(passesDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() && entry.name.endsWith(".pass"))
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");

  if (req.method === "OPTIONS") return res.status(200).end();

  const missingEnv = REQUIRED_ENV_VARS.filter(
    (key) => !process.env[key] || String(process.env[key]).trim() === ""
  );
  const templates = getTemplates();
  const signingReady = missingEnv.length === 0 && templates.length > 0;

  return res.status(200).json({
    ok: signingReady,
    version: process.env.VERSION || "unknown",
    gitSha: process.env.VERCEL_GIT_COMMIT_SHA || "unknown",
    templates,
    signingReady,
    missingEnv,
  });
}
