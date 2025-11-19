import { Router } from "express";

import {
  listMyEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} from "../controllers/calendarEvents.controller";
import { requireAuth } from "../middleware/auth";

export const router = Router();

router.get("/", requireAuth, listMyEvents);
router.post("/", requireAuth, createEvent);
router.patch("/:id", requireAuth, updateEvent);
router.delete("/:id", requireAuth, deleteEvent);
