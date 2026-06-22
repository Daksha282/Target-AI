import express, { type Express } from "express";
import cors from "cors";
import recommendRouter from "./recommend";

/**
 * Builds the configured Express app (middleware + routes) WITHOUT binding a
 * port. Shared by the local dev server (server/index.ts, which calls listen)
 * and the Vercel serverless entry (api/index.ts, which exports the app as a
 * request handler) so both runtimes use one source of truth for Layer 2.
 */
export function createApp(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());
  // Router handles /recommend and /brief internally → full paths:
  // POST /api/recommend and POST /api/brief.
  app.use("/api", recommendRouter);
  return app;
}
