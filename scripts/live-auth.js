#!/usr/bin/env node

import fs from "node:fs";

function readEnvFile(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const env = {};

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }

  return env;
}

async function main() {
  const [, , envFilePath, email, password, outputPath] = process.argv;
  if (!envFilePath || !email || !password || !outputPath) {
    throw new Error(
      "Usage: node scripts/live-auth.js <env-file> <email> <password> <output-path>"
    );
  }

  const env = readEnvFile(envFilePath);
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const anonKey = env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in env file");
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.access_token) {
    throw new Error(
      `Auth failed (${response.status}): ${JSON.stringify(payload).slice(0, 400)}`
    );
  }

  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        access_token: payload.access_token,
        refresh_token: payload.refresh_token || null,
        email: payload.user?.email || null,
        user_id: payload.user?.id || null,
      },
      null,
      2
    )
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        email: payload.user?.email || null,
        user_id: payload.user?.id || null,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
