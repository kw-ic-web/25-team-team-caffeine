import type { Express } from "express";

import { router as authRouter } from "./auth.routes";
import { router as usersRouter } from "./users.routes";

export function registerRoutes(app: Express) {
  app.use("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);
}

