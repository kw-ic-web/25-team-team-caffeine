import { Router } from "express";

import {
  listMyGoals,
  createGoal,
  updateGoal,
  deleteGoal,
} from "../controllers/goals.controller.js";
import { requireAuth } from "../middleware/auth.js";

export const router = Router();

router.get("/", requireAuth, listMyGoals);
router.post("/", requireAuth, createGoal);
router.patch("/:id", requireAuth, updateGoal);
router.delete("/:id", requireAuth, deleteGoal);
