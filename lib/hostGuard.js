function normalizeHostValue(raw) {
  const first = String(raw || "").split(",")[0].trim().toLowerCase();
  if (!first) return "";

  if (first.startsWith("[")) {
    const end = first.indexOf("]");
    if (end !== -1) return first.slice(1, end);
  }

  return first.replace(/:\d+$/, "");
}

export function getRequestHost(req) {
  const forwarded = req?.headers?.["x-forwarded-host"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return normalizeHostValue(forwarded);
  }

  const host = req?.headers?.host;
  if (typeof host === "string" && host.trim()) {
    return normalizeHostValue(host);
  }

  return "";
}

export function getHostGuardContext(req) {
  const host = getRequestHost(req);
  const prodDomain = String(process.env.PROD_DOMAIN || "www.showfi.io").trim().toLowerCase();
  const allowNonProd = String(process.env.ALLOW_NONPROD_WALLET || "").trim().toLowerCase() === "true";
  const allowed = allowNonProd || (host !== "" && host === prodDomain);
  return { allowed, host, prodDomain };
}

function nonProdPayload(ctx) {
  return {
    ok: false,
    error: "non_prod_host",
    host: ctx.host || "",
    prod: `https://${ctx.prodDomain || "www.showfi.io"}`,
  };
}

export function nonProdHealthResponse(res, ctx) {
  return res.status(200).json(nonProdPayload(ctx));
}

export function nonProdForbiddenResponse(res, ctx) {
  return res.status(403).json(nonProdPayload(ctx));
}
