function isJsonRequest(req) {
  const contentType = String(req.headers["content-type"] || "").toLowerCase();
  return contentType.includes("application/json");
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (!isJsonRequest(req)) return null;

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getBaseUrl(req) {
  const proto = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  if (!host) return null;
  return `${proto}://${host}`;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");

  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      message: "Use POST",
    });
  }

  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      ok: false,
      message: "API_KEY is not configured on the server",
    });
  }

  const body = await readJsonBody(req);
  if (!body) {
    return res.status(400).json({
      ok: false,
      message: "Invalid or missing JSON body",
    });
  }

  const baseUrl = getBaseUrl(req);
  if (!baseUrl) {
    return res.status(500).json({
      ok: false,
      message: "Unable to determine host for proxy request",
    });
  }

  try {
    const upstream = await fetch(`${baseUrl}/api/pass`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(body),
    });

    res.status(upstream.status);

    if (!upstream.ok) {
      const contentType = upstream.headers.get("content-type") || "text/plain";
      res.setHeader("Content-Type", contentType);
      const text = await upstream.text();
      return res.send(text);
    }

    const contentType = upstream.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);

    const contentDisposition = upstream.headers.get("content-disposition");
    if (contentDisposition) {
      res.setHeader("Content-Disposition", contentDisposition);
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    return res.send(buffer);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Failed to reach /api/pass",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
