import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { OAuth2Client } from "google-auth-library";
import { loadLocalEnvFiles } from "./env-loader.js";

const SEARCH_CONSOLE_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const DEFAULT_PORT = 8734;
const DEFAULT_TOKEN_FILE = path.join(".secrets", "google-search-console-token.json");
const DEFAULT_RETRY_ATTEMPTS = 4;
const DEFAULT_RETRY_BASE_DELAY_MS = 1500;

function normalizeText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function getEnv(name, fallback = "") {
  return normalizeText(process.env[name] || fallback);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryAttempts() {
  const value = Number.parseInt(getEnv("GOOGLE_SEARCH_CONSOLE_RETRY_ATTEMPTS", String(DEFAULT_RETRY_ATTEMPTS)), 10);
  return Number.isInteger(value) && value > 0 ? value : DEFAULT_RETRY_ATTEMPTS;
}

function getRetryBaseDelayMs() {
  const value = Number.parseInt(
    getEnv("GOOGLE_SEARCH_CONSOLE_RETRY_BASE_DELAY_MS", String(DEFAULT_RETRY_BASE_DELAY_MS)),
    10
  );
  return Number.isInteger(value) && value > 0 ? value : DEFAULT_RETRY_BASE_DELAY_MS;
}

function isRetryableNetworkError(error) {
  const code = normalizeText(error?.code || "");
  return ["ENOTFOUND", "EAI_AGAIN", "ECONNRESET", "ETIMEDOUT", "ECONNREFUSED"].includes(code);
}

function isRetryableHttpStatus(status) {
  return status === 429 || status === 408 || status >= 500;
}

async function withGoogleRetry(task, label) {
  const attempts = getRetryAttempts();
  const baseDelayMs = getRetryBaseDelayMs();
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      const shouldRetry = isRetryableNetworkError(error) || isRetryableHttpStatus(Number(error?.status || 0));
      if (!shouldRetry || attempt === attempts) {
        throw error;
      }

      const delayMs = baseDelayMs * 2 ** (attempt - 1);
      console.error(
        `${label} failed (${error.code || error.status || "retryable error"}). Retrying in ${delayMs}ms...`
      );
      await sleep(delayMs);
    }
  }

  throw lastError;
}

function ensureTokenDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function listGitWorktreePaths(cwd = process.cwd()) {
  try {
    const output = execFileSync("git", ["worktree", "list", "--porcelain"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });

    return output
      .split(/\r?\n/)
      .filter((line) => line.startsWith("worktree "))
      .map((line) => line.slice("worktree ".length).trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function getConfigSearchPaths() {
  const paths = [process.cwd(), ...listGitWorktreePaths()];
  return [...new Set(paths)];
}

function loadEnvAcrossPaths(paths) {
  for (const cwd of paths) {
    loadLocalEnvFiles({ cwd });
  }
}

function resolveDefaultTokenPath(paths) {
  for (const cwd of paths) {
    const candidate = path.join(cwd, DEFAULT_TOKEN_FILE);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return path.join(paths[0] || process.cwd(), DEFAULT_TOKEN_FILE);
}

export function getGscConfig() {
  const searchPaths = getConfigSearchPaths();
  loadEnvAcrossPaths(searchPaths);

  const clientId = getEnv("GOOGLE_SEARCH_CONSOLE_CLIENT_ID");
  const clientSecret = getEnv("GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET");
  const siteUrl = getEnv("GOOGLE_SEARCH_CONSOLE_SITE_URL");
  const tokenPath = getEnv("GOOGLE_SEARCH_CONSOLE_TOKEN_PATH", resolveDefaultTokenPath(searchPaths));
  const port = Number.parseInt(getEnv("GOOGLE_SEARCH_CONSOLE_OAUTH_PORT", String(DEFAULT_PORT)), 10);

  return {
    clientId,
    clientSecret,
    siteUrl,
    tokenPath,
    port: Number.isInteger(port) && port > 0 ? port : DEFAULT_PORT,
  };
}

export function createOauthClient(config = getGscConfig()) {
  if (!config.clientId || !config.clientSecret) {
    throw new Error(
      "Missing GOOGLE_SEARCH_CONSOLE_CLIENT_ID or GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET in your local env."
    );
  }

  const redirectUri = `http://127.0.0.1:${config.port}/oauth2callback`;
  return new OAuth2Client({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    redirectUri,
  });
}

export function loadSavedTokens(config = getGscConfig()) {
  try {
    const raw = fs.readFileSync(config.tokenPath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveTokens(tokens, config = getGscConfig()) {
  ensureTokenDir(config.tokenPath);
  fs.writeFileSync(config.tokenPath, `${JSON.stringify(tokens, null, 2)}\n`, "utf8");
}

export async function getAuthorizedClient(config = getGscConfig()) {
  const client = createOauthClient(config);
  const tokens = loadSavedTokens(config);
  if (!tokens) {
    throw new Error(
      `No saved Google Search Console token found at ${config.tokenPath}. Run "npm run gsc:auth" first.`
    );
  }

  client.setCredentials(tokens);
  const accessToken = await withGoogleRetry(() => client.getAccessToken(), "Google OAuth token refresh");
  if (!accessToken?.token) {
    throw new Error("Unable to obtain a Google Search Console access token from the saved credentials.");
  }

  if (client.credentials?.refresh_token && client.credentials?.access_token) {
    saveTokens(client.credentials, config);
  }

  return client;
}

export async function getAccessToken(client) {
  const result = await withGoogleRetry(() => client.getAccessToken(), "Google OAuth access token request");
  const token = typeof result === "string" ? result : result?.token || "";
  if (!token) {
    throw new Error("Failed to obtain access token.");
  }
  return token;
}

export async function googleJsonRequest(url, { method = "GET", body, client }) {
  const accessToken = await getAccessToken(client);
  return withGoogleRetry(async () => {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload?.error?.message || `Google API request failed with status ${response.status}`;
      const error = new Error(message);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return payload;
  }, "Google Search Console request");
}

export function getSearchConsoleScope() {
  return SEARCH_CONSOLE_SCOPE;
}

export async function waitForOauthCode(server) {
  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.on("request", (req, res) => {
      const url = new URL(req.url || "/", "http://127.0.0.1");
      if (url.pathname !== "/oauth2callback") {
        res.statusCode = 404;
        res.end("Not found");
        return;
      }

      const error = normalizeText(url.searchParams.get("error") || "");
      const code = normalizeText(url.searchParams.get("code") || "");

      if (error) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end(`Google authorization failed: ${error}`);
        reject(new Error(`Google authorization failed: ${error}`));
        return;
      }

      if (!code) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end("Missing OAuth code.");
        reject(new Error("Missing OAuth code."));
        return;
      }

      res.statusCode = 200;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Google Search Console access saved. You can close this tab.");
      resolve(code);
    });
  });
}

export function createCallbackServer(port) {
  const server = http.createServer();
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}
