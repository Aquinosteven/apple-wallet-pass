import { getSupabaseAdmin } from "../../lib/ghlIntegration.js";
import { createWebhookIngestionHandler } from "../../lib/threadA/webhookIngestion.js";

const handler = createWebhookIngestionHandler({
  scope: "event",
  getSupabaseAdmin,
});

export default handler;
