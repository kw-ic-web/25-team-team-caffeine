import type { Express } from "express";
import { router as authRouter } from "./auth.routes.js";
import { router as usersRouter } from "./users.routes.js";
import { router as goalsRouter } from "./goals.routes.js";
import { router as petsRouter } from "./pets.routes.js";
import { router as userPowderRouter } from "./userPowder.routes.js";
import { router as calendarEventsRouter } from "./calendarEvents.routes.js";
import dailyTasksRoutes from "./dailyTasks.routes.js";
import communityRouter from "./community.routes.js"; 
import express from "express";
import path from "path";

export function registerRoutes(app: Express) {
  app.use("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/goals", goalsRouter);
  app.use("/api/pets", petsRouter);
  app.use("/api/powder", userPowderRouter);
  app.use("/api/calendar-events", calendarEventsRouter);
  app.use("/api/daily-tasks", dailyTasksRoutes);
  app.use("/api/community", communityRouter);
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
}