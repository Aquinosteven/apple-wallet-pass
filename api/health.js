const allow = (origin) => {
  // Allow localhost
  if (origin === "http://localhost:5173") return true;
  if (origin === "http://localhost:3000") return true;

  // Allow any Bolt hosted origin
  if (typeof origin === "string" && origin.endsWith(".bolt.host")) return true;

  return false;
};

export default function handler(req, res) {
  const origin = req.headers.origin;       // may be undefined
  const referer = req.headers.referer;     // often present

  // If Origin is present and allowed, echo it (proper CORS)
  if (origin && allow(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  // If Origin is missing but Referer is from bolt.host, allow wildcard JUST for this endpoint
  // (still safer than leaving '*' everywhere)
  if (!origin && typeof referer === "string" && referer.includes(".bolt.host")) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(204).end();

  return res.status(200).json({
    ok: true,
    service: "apple-wallet-pass",
    time: new Date().toISOString(),
    debug: {
      origin_received: origin || null,
      referer_received: referer || null,
    },
  });
}
