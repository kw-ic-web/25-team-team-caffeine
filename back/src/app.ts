import express from "express";
import cors from "cors";
import pino from "pino-http";

import { registerRoutes } from "./routes";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN?.split(",") ?? "*",
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(pino());

  registerRoutes(app);

  return app;
}

