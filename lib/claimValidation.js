export function getTokenFromGetQuery(req) {
  const raw = req?.query?.token;
  if (typeof raw === "string") {
    return raw.trim();
  }
  if (Array.isArray(raw) && typeof raw[0] === "string") {
    return raw[0].trim();
  }
  return "";
}

export function getTokenFromBody(body) {
  if (!body || typeof body !== "object") {
    return "";
  }
  if (typeof body.token === "string") {
    return body.token.trim();
  }
  return "";
}

export function validateClaimToken(token) {
  if (!token) return "token is required";
  if (token.length < 64 || token.length > 128) return "token is invalid";
  if (!/^[a-f0-9]+$/i.test(token)) return "token is invalid";
  return null;
}

