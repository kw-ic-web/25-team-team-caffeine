import { Router } from "express";

import {
  listMyGoals,
  createGoal,
  updateGoal,
  deleteGoal,
} from "../controllers/goals.controller";
import { requireAuth } from "../middleware/auth";

export const router = Router();

// 내 목표 리스트
router.get("/", requireAuth, listMyGoals);

// 목표 생성
router.post("/", requireAuth, createGoal);

// 목표 수정
router.patch("/:id", requireAuth, updateGoal);

// 목표 삭제
router.delete("/:id", requireAuth, deleteGoal);
