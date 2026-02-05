import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import type { IncomingMessage, ServerResponse } from "node:http";
import clientPassHandler from "./api/client-pass.js";
import passHandler from "./api/pass.js";
import healthPassHandler from "./api/health-pass.js";

const vercelHandlers: Array<{ prefix: string; handler: Handler }>= [
  { prefix: "/api/client-pass", handler: clientPassHandler },
  { prefix: "/api/pass", handler: passHandler },
  { prefix: "/api/health-pass", handler: healthPassHandler },
];

type Handler = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;

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

function localApiPlugin() {
  return {
    name: "local-api",
    configureServer(server: { middlewares: { use: Function } }) {
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = req.url || "";
        const matched = vercelHandlers.find((entry) => url.startsWith(entry.prefix));
        if (!matched) return next();
        const wrapped = withVercelResponse(res);
        Promise.resolve(matched.handler(req, wrapped)).catch((error) => {
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
}));
