import { GoogleAuth } from "google-auth-library";

const WALLET_SCOPE = "https://www.googleapis.com/auth/wallet_object.issuer";
const CLASS_SUFFIX = "showfi.generic.v1";

function responseShape({
  issuerId,
  classId,
  tokenOk,
  apiOk,
  apiStatus,
  apiError,
}) {
  return {
    ok: Boolean(tokenOk && apiOk),
    issuerId,
    classId,
    tokenOk: Boolean(tokenOk),
    apiOk: Boolean(apiOk),
    apiStatus: apiStatus ?? null,
    apiError: apiError ?? null,
  };
}

function parseServiceAccount(raw) {
  if (!raw || String(raw).trim() === "") {
    throw new Error("Missing GOOGLE_WALLET_SA_JSON");
  }
  try {
    return JSON.parse(String(raw));
  } catch {
    throw new Error("Invalid GOOGLE_WALLET_SA_JSON");
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res.status(200).json(
      responseShape({
        issuerId: String(process.env.GOOGLE_WALLET_ISSUER_ID || ""),
        classId: "",
        tokenOk: false,
        apiOk: false,
        apiStatus: null,
        apiError: "Use GET",
      })
    );
  }

  const issuerId = String(process.env.GOOGLE_WALLET_ISSUER_ID || "").trim();
  const classId = issuerId ? `${issuerId}.${CLASS_SUFFIX}` : "";

  let tokenOk = false;
  let apiOk = false;
  let apiStatus = null;
  let apiError = null;

  try {
    const credentials = parseServiceAccount(process.env.GOOGLE_WALLET_SA_JSON);
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
    } else if (!issuerId) {
      apiError = "Missing GOOGLE_WALLET_ISSUER_ID";
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
    apiError = error instanceof Error ? error.message : String(error);
  }

  return res
    .status(200)
    .json(responseShape({ issuerId, classId, tokenOk, apiOk, apiStatus, apiError }));
}
