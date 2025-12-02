import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";

import {
  getTodayDailyTasks,
  completeDailyTask,
  failDailyTask,
} from "../controllers/dailyTasks.controller.js";

const router = Router();

router.get("/today", requireAuth, getTodayDailyTasks);
router.post("/:id/complete", requireAuth, completeDailyTask);
router.post("/:id/fail", requireAuth, failDailyTask);

export default router;