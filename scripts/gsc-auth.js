import process from "node:process";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  createCallbackServer,
  createOauthClient,
  getGscConfig,
  getSearchConsoleScope,
  saveTokens,
  waitForOauthCode,
} from "./gsc-client.js";

const execFileAsync = promisify(execFile);

async function openBrowser(url) {
  try {
    await execFileAsync("open", [url]);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const config = getGscConfig();
  const client = createOauthClient(config);
  const server = await createCallbackServer(config.port);

  try {
    const authUrl = client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [getSearchConsoleScope()],
    });

    const opened = await openBrowser(authUrl);
    console.log("Google Search Console auth setup");
    console.log(`Redirect URI: http://127.0.0.1:${config.port}/oauth2callback`);
    console.log(`Token file: ${config.tokenPath}`);
    if (!opened) {
      console.log("Open this URL in your browser:");
      console.log(authUrl);
    }

    const code = await waitForOauthCode(server);
    const { tokens } = await client.getToken(code);
    if (!tokens?.refresh_token) {
      throw new Error("Google did not return a refresh token. Re-run the auth flow and grant access.");
    }

    saveTokens(tokens, config);
    console.log("Saved Google Search Console credentials successfully.");
    if (config.siteUrl) {
      console.log(`Configured property: ${config.siteUrl}`);
    } else {
      console.log("Next step: set GOOGLE_SEARCH_CONSOLE_SITE_URL in .env.local, then run npm run gsc:sites.");
    }
  } finally {
    server.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
