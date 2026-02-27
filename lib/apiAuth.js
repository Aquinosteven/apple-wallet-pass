import { getSupabaseAdmin } from "./ghlIntegration.js";

function getBearerToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || typeof authHeader !== "string") {
    return "";
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return "";
  }

  return token.trim();
}

export async function getAuthenticatedUser(req) {
  const token = getBearerToken(req);
  if (!token) {
    return { user: null, error: "Missing Authorization bearer token", status: 401 };
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return { user: null, error: "Invalid or expired auth token", status: 401 };
    }

    return { user: data.user, error: null, status: 200 };
  } catch {
    return { user: null, error: "Invalid or expired auth token", status: 401 };
  }
}

export function setJsonCors(res, methods, allowAuth = true) {
  const headers = ["Content-Type"];
  if (allowAuth) headers.push("Authorization");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", methods.join(","));
  res.setHeader("Access-Control-Allow-Headers", headers.join(", "));
}
