import fs from "fs";
import path from "path";

const PASS_REQUIRED_ENV_VARS = [
  "SIGNER_CERT_PEM",
  "SIGNER_KEY_PEM",
  "PASS_P12_PASSWORD",
  "WWDR_PEM",
  "APPLE_PASS_TYPE_ID",
  "APPLE_TEAM_ID",
  "APPLE_ORG_NAME",
];

const WALLET_SCOPE = "https://www.googleapis.com/auth/wallet_object.issuer";
const CLASS_SUFFIX = "showfi.generic.v1";
const ENV_SERVICE_ACCOUNT = "GOOGLE_WALLET_SERVICE_ACCOUNT_JSON";
const ENV_SERVICE_ACCOUNT_LEGACY = "GOOGLE_WALLET_SA_JSON";

class HttpError extends Error {
  constructor(status, message, missing = []) {
    super(message);
    this.status = status;
    this.missing = missing;
  }
}

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

function getMode(req) {
  const queryMode = req?.query?.mode;
  if (typeof queryMode === "string") return queryMode.trim().toLowerCase();
  if (Array.isArray(queryMode) && typeof queryMode[0] === "string") {
    return queryMode[0].trim().toLowerCase();
  }
  try {
    const parsed = new URL(req.url || "", "http://localhost");
    return String(parsed.searchParams.get("mode") || "").trim().toLowerCase();
  } catch {
    return "";
  }
}

function responseShape({
  issuerId,
  classId,
  tokenOk,
  apiOk,
  apiStatus,
  apiError,
  warnings,
}) {
  return {
    ok: Boolean(tokenOk && apiOk),
    issuerId,
    classId,
    tokenOk: Boolean(tokenOk),
    apiOk: Boolean(apiOk),
    apiStatus: apiStatus ?? null,
    apiError: apiError ?? null,
    warnings: Array.isArray(warnings) ? warnings : [],
  };
}

function parseServiceAccount(raw) {
  if (!raw || String(raw).trim() === "") {
    throw new HttpError(400, "Missing required environment variables", [ENV_SERVICE_ACCOUNT]);
  }
  try {
    return JSON.parse(String(raw));
  } catch {
    throw new HttpError(400, `Invalid ${ENV_SERVICE_ACCOUNT}`);
  }
}

function getServiceAccountEnvValue() {
  const preferred = String(process.env[ENV_SERVICE_ACCOUNT] || "").trim();
  if (preferred) {
    return { value: preferred, warnings: [] };
  }

  const legacy = String(process.env[ENV_SERVICE_ACCOUNT_LEGACY] || "").trim();
  if (legacy) {
    return {
      value: legacy,
      warnings: [
        `${ENV_SERVICE_ACCOUNT_LEGACY} is deprecated; please migrate to ${ENV_SERVICE_ACCOUNT}.`,
      ],
    };
  }

  return { value: "", warnings: [] };
}

async function handlePassMode(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Use GET" });
  }

  const missingEnv = PASS_REQUIRED_ENV_VARS.filter(
    (key) => !process.env[key] || String(process.env[key]).trim() === ""
  );
  const templates = getTemplates();
  const signingReady = missingEnv.length === 0;

  return res.status(200).json({
    ok: signingReady,
    version: process.env.VERSION || "unknown",
    gitSha: process.env.VERCEL_GIT_COMMIT_SHA || "unknown",
    templates,
    signingReady,
    missingEnv,
  });
}

async function handleGwalletMode(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json(
      responseShape({
        issuerId: String(process.env.GOOGLE_WALLET_ISSUER_ID || ""),
        classId: "",
        tokenOk: false,
        apiOk: false,
        apiStatus: null,
        apiError: "Use GET",
        warnings: [],
      })
    );
  }

  const issuerId = String(process.env.GOOGLE_WALLET_ISSUER_ID || "").trim();
  const classId = issuerId ? `${issuerId}.${CLASS_SUFFIX}` : "";

  let tokenOk = false;
  let apiOk = false;
  let apiStatus = null;
  let apiError = null;
  const warnings = [];

  try {
    if (!issuerId) {
      throw new HttpError(400, "Missing required environment variables", [
        "GOOGLE_WALLET_ISSUER_ID",
      ]);
    }
    const { value: serviceAccountRaw, warnings: envWarnings } = getServiceAccountEnvValue();
    warnings.push(...envWarnings);
    const credentials = parseServiceAccount(serviceAccountRaw);

    const { GoogleAuth } = await import("google-auth-library");
    const auth = new GoogleAuth({
      credentials,
      scopes: [WALLET_SCOPE],
    });
    const client = await auth.getClient();
    const tokenResult = await client.getAccessToken();
    const accessToken =
      typeof tokenResult === "string" ? tokenResult : tokenResult?.token || null;

    tokenOk = Boolean(accessToken);
    if (!tokenOk) {
      apiError = "Failed to obtain access token";
    } else {
      const url = `https://walletobjects.googleapis.com/walletobjects/v1/genericClass/${encodeURIComponent(classId)}`;
      const apiResponse = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });

      apiStatus = apiResponse.status;
      apiOk = apiResponse.ok;

      if (!apiResponse.ok) {
        let bodyText = "";
        try {
          bodyText = await apiResponse.text();
        } catch {
          bodyText = "";
        }
        apiError = bodyText || `Wallet API request failed with status ${apiResponse.status}`;
      }
    }
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.status).json({
        ok: false,
        error: error.message,
        missing: error.missing,
        warnings,
      });
    }
    apiError = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      ok: false,
      error: apiError,
      missing: [],
      warnings,
    });
  }

  return res
    .status(200)
    .json(responseShape({ issuerId, classId, tokenOk, apiOk, apiStatus, apiError, warnings }));
}

export default async function handler(req, res) {
  // Always allow cross-origin reads for health checks
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(204).end();

  const mode = getMode(req);
  if (mode === "pass") return handlePassMode(req, res);
  if (mode === "gwallet") return handleGwalletMode(req, res);

  return res.status(200).json({
    ok: true,
    service: "apple-wallet-pass",
    time: new Date().toISOString(),
  });
}
