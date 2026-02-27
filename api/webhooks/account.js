import { getSupabaseAdmin } from "../../lib/ghlIntegration.js";
import { createWebhookIngestionHandler } from "../../lib/threadA/webhookIngestion.js";

const handler = createWebhookIngestionHandler({
  scope: "account",
  getSupabaseAdmin,
});

export default handler;
