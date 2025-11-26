import type { Express } from "express";

import { router as authRouter } from "./auth.routes";
import { router as usersRouter } from "./users.routes";
import { router as goalsRouter } from "./goals.routes";
import { router as petsRouter } from "./pets.routes";
import { router as userPowderRouter } from "./userPowder.routes";
import { router as calendarEventsRouter } from "./calendarEvents.routes";

export function registerRoutes(app: Express) {
  app.use("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/goals", goalsRouter);
  app.use("/api/pets", petsRouter);
  app.use("/api/powder", userPowderRouter);
  app.use("/api/calendar-events", calendarEventsRouter);
}
