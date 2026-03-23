import fs from "node:fs";
import path from "node:path";

const DEFAULT_ENV_FILES = [
  ".env.local",
  ".env.production.local",
  ".env.development.local",
];

function parseEnvLine(rawLine) {
  const line = rawLine.trim();
  if (!line || line.startsWith("#")) return null;

  const eq = line.indexOf("=");
  if (eq < 0) return null;

  const key = line.slice(0, eq).trim();
  if (!/^[A-Z0-9_]+$/.test(key)) return null;

  let value = line.slice(eq + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return { key, value };
}

export function loadLocalEnvFiles({
  cwd = process.cwd(),
  files = DEFAULT_ENV_FILES,
} = {}) {
  for (const relativeFile of files) {
    const filePath = path.join(cwd, relativeFile);
    if (!fs.existsSync(filePath)) continue;

    const text = fs.readFileSync(filePath, "utf8");
    for (const rawLine of text.split(/\r?\n/)) {
      const parsed = parseEnvLine(rawLine);
      if (!parsed) continue;
      if (!process.env[parsed.key]) {
        process.env[parsed.key] = parsed.value;
      }
    }
  }
}

export function getEnv(name, fallbackNames = []) {
  const names = [name, ...fallbackNames];
  for (const candidate of names) {
    const value = String(process.env[candidate] || "").trim();
    if (value) return value;
  }
  return "";
}
