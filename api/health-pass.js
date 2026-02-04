export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, message: "Use GET" });
  }

  return res.status(200).json({
    ok: true,
    route: "/health-pass",
    env: {
      hasApiKey: Boolean(process.env.API_KEY),
    },
  });
}

