import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import type { IncomingMessage, ServerResponse } from "node:http";
import passHandler from "./api/pass.js";
import healthHandler from "./api/health.js";
import googleSaveHandler from "./api/google-save.js";
import eventsHandler from "./api/events.js";
import ticketDesignsHandler from "./api/ticket-designs.js";
import dashboardMetricsHandler from "./api/dashboard-metrics.js";
import exportsHandler from "./api/exports.js";
import adminHandler from "./api/admin.js";
import supportHandler from "./api/support.js";
import billingStatusHandler from "./api/billing/status.js";
import billingCheckoutSessionHandler from "./api/billing/checkout-session.js";
import authSignupHandler from "./api/auth/signup.js";
import ghlStatusHandler from "./api/integrations/ghl/status.js";
import ghlConnectHandler from "./api/integrations/ghl/connect.js";
import ghlTestHandler from "./api/integrations/ghl/test.js";
import opsHealthHandler from "./api/ops/health.js";
import opsErrorsHandler from "./api/ops/errors.js";
import squareWebhookHandler from "./api/webhooks/square.js";

const vercelHandlers: Array<{ prefix: string; handler: Handler }>= [
  { prefix: "/api/client-pass", handler: passHandler },
  { prefix: "/api/pass", handler: passHandler },
  { prefix: "/api/health", handler: healthHandler },
  { prefix: "/api/google-save", handler: googleSaveHandler },
  { prefix: "/api/events", handler: eventsHandler },
  { prefix: "/api/ticket-designs", handler: ticketDesignsHandler },
  { prefix: "/api/dashboard-metrics", handler: dashboardMetricsHandler },
  { prefix: "/api/exports", handler: exportsHandler },
  { prefix: "/api/admin", handler: adminHandler },
  { prefix: "/api/support", handler: supportHandler },
  { prefix: "/api/billing/status", handler: billingStatusHandler },
  { prefix: "/api/billing/checkout-session", handler: billingCheckoutSessionHandler },
  { prefix: "/api/auth/signup", handler: authSignupHandler },
  { prefix: "/api/integrations/ghl/status", handler: ghlStatusHandler },
  { prefix: "/api/integrations/ghl/connect", handler: ghlConnectHandler },
  { prefix: "/api/integrations/ghl/test", handler: ghlTestHandler },
  { prefix: "/api/ops/health", handler: opsHealthHandler },
  { prefix: "/api/ops/errors", handler: opsErrorsHandler },
  { prefix: "/api/webhooks/square", handler: squareWebhookHandler },
];

type Handler = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;
type VercelRequest = IncomingMessage & {
  query?: Record<string, string | string[]>;
};

type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
  send: (data: unknown) => void;
};

function withVercelResponse(res: ServerResponse): VercelResponse {
  const vercelRes = res as VercelResponse;

  if (!vercelRes.status) {
    vercelRes.status = (code: number) => {
      vercelRes.statusCode = code;
      return vercelRes;
    };
  }

  if (!vercelRes.json) {
    vercelRes.json = (data: unknown) => {
      if (!vercelRes.getHeader("Content-Type")) {
        vercelRes.setHeader("Content-Type", "application/json");
      }
      vercelRes.end(JSON.stringify(data));
    };
  }

  if (!vercelRes.send) {
    vercelRes.send = (data: unknown) => {
      if (Buffer.isBuffer(data) || typeof data === "string") {
        vercelRes.end(data);
        return;
      }
      if (data === undefined || data === null) {
        vercelRes.end();
        return;
      }
      if (!vercelRes.getHeader("Content-Type")) {
        vercelRes.setHeader("Content-Type", "application/json");
      }
      vercelRes.end(JSON.stringify(data));
    };
  }

  return vercelRes;
}

function withVercelRequest(req: IncomingMessage): VercelRequest {
  const vercelReq = req as VercelRequest;
  const parsedUrl = new URL(req.url || "/", "http://localhost");
  const query: Record<string, string | string[]> = {};

  for (const [key, value] of parsedUrl.searchParams.entries()) {
    const current = query[key];
    if (current === undefined) {
      query[key] = value;
      continue;
    }
    query[key] = Array.isArray(current) ? [...current, value] : [current, value];
  }

  vercelReq.query = query;
  return vercelReq;
}

function localApiPlugin() {
  return {
    name: "local-api",
    configureServer(server: { middlewares: { use: (fn: (req: IncomingMessage, res: ServerResponse, next: () => void) => void) => void } }) {
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = req.url || "";
        const matched = vercelHandlers.find((entry) => url.startsWith(entry.prefix));
        if (!matched) return next();
        const wrappedReq = withVercelRequest(req);
        const wrapped = withVercelResponse(res);
        Promise.resolve(matched.handler(wrappedReq, wrapped)).catch((error) => {
          wrapped.status(500).json({
            ok: false,
            message: "Local API error",
            error: error instanceof Error ? error.message : String(error),
          });
        });
      });
    },
  };
}

export default defineConfig(({ command }) => ({
  plugins: [react(), command === "serve" ? localApiPlugin() : undefined].filter(Boolean),
  optimizeDeps: {
    exclude: ["lucide-react"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("react") || id.includes("scheduler")) return "react-vendor";
          if (id.includes("@supabase")) return "supabase-vendor";
          if (id.includes("react-router")) return "router-vendor";
          if (id.includes("lucide-react")) return "icons-vendor";
          return "vendor";
        },
      },
    },
  },
}));
