import process from "node:process";
import { getAuthorizedClient, googleJsonRequest } from "./gsc-client.js";

async function main() {
  const client = await getAuthorizedClient();
  const payload = await googleJsonRequest(
    "https://searchconsole.googleapis.com/webmasters/v3/sites",
    { client }
  );

  const entries = Array.isArray(payload.siteEntry) ? payload.siteEntry : [];
  if (!entries.length) {
    console.log("No Search Console properties were returned for this account.");
    return;
  }

  for (const entry of entries) {
    const siteUrl = String(entry.siteUrl || "").trim();
    const permission = String(entry.permissionLevel || "").trim();
    console.log(`${siteUrl}\t${permission}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
