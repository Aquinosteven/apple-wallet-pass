export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    service: "apple-wallet-pass",
    time: new Date().toISOString()
  });
}
