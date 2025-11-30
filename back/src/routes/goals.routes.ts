import { Router } from "express";

import {
  listMyGoals,
  createGoal,
  updateGoal,
  deleteGoal,
} from "../controllers/goals.controller";
import { requireAuth } from "../middleware/auth";

export const router = Router();

router.get("/", requireAuth, listMyGoals);
router.post("/", requireAuth, createGoal);
router.patch("/:id", requireAuth, updateGoal);
router.delete("/:id", requireAuth, deleteGoal);
