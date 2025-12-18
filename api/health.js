const ALLOWED = new Set([
  "https://saas-wallet-pass-eve-iurc.bolt.host",
  "http://localhost:5173",
  "http://localhost:3000",
]);

export default function handler(req, res) {
  const origin = req.headers.origin;

  if (origin && ALLOWED.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(204).end();

  return res.status(200).json({
    ok: true,
    service: "apple-wallet-pass",
    time: new Date().toISOString(),
  });
}
