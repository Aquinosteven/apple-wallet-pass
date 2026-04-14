import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const GSC_ENTRYPOINTS = new Map([
  ["auth", "gsc-auth.js"],
  ["sites", "gsc-sites.js"],
  ["top-queries", "gsc-top-queries.js"],
  ["target-keywords", "gsc-target-keywords.js"],
]);

function getNpmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function hasInstalledPackage(packageName) {
  try {
    execFileSync(
      process.execPath,
      ["-e", `import(${JSON.stringify(packageName)}).then(() => process.exit(0)).catch(() => process.exit(1))`],
      {
        cwd: repoRoot,
        stdio: "ignore",
      }
    );
    return true;
  } catch {
    return false;
  }
}

function ensureDependencies() {
  if (hasInstalledPackage("google-auth-library")) {
    return;
  }

  const hasLockfile = fs.existsSync(path.join(repoRoot, "package-lock.json"));
  const npm = getNpmCommand();
  const installArgs = hasLockfile ? ["ci", "--no-audit", "--no-fund"] : ["install", "--no-audit", "--no-fund"];

  console.error("Search Console dependencies are missing in this worktree. Installing them now...");
  execFileSync(npm, installArgs, {
    cwd: repoRoot,
    stdio: "inherit",
  });
}

function main() {
  const [commandName, ...restArgs] = process.argv.slice(2);
  const scriptName = GSC_ENTRYPOINTS.get(commandName || "");

  if (!scriptName) {
    console.error(`Unknown GSC command: ${commandName || "(missing)"}`);
    process.exit(1);
  }

  ensureDependencies();

  const result = spawnSync(process.execPath, [path.join(__dirname, scriptName), ...restArgs], {
    cwd: repoRoot,
    stdio: "inherit",
  });

  if (typeof result.status === "number") {
    process.exit(result.status);
  }

  process.exit(1);
}

main();
