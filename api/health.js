const isAllowedOrigin = (origin) => {
  if (!origin) return false;
  if (origin === "http://localhost:5173") return true;
  if (origin === "http://localhost:3000") return true;
  // Allow any Bolt-hosted app
  if (origin.endsWith(".bolt.host")) return true;
  return false;
};

export default function handler(req, res) {
  const origin = req.headers.origin;

  if (isAllowedOrigin(origin)) {
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
