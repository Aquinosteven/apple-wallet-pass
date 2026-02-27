import { WEBHOOK_MAPPING_PRESETS } from "../../../lib/threadA/webhookMapping.js";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  return res.status(200).json({
    ok: true,
    presets: WEBHOOK_MAPPING_PRESETS,
  });
}
