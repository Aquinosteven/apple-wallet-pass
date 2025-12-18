export default function handler(req, res) {
  // Always allow cross-origin reads for health checks
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(204).end();

  return res.status(200).json({
    ok: true,
    service: "apple-wallet-pass",
    time: new Date().toISOString(),
  });
}
