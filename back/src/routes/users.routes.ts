// back/src/routes/users.routes.ts
import { Router } from "express";

import { getCurrentUser, listUsers } from "../controllers/users.controller";
import { requireAuth } from "../middleware/auth";

export const router = Router();

// 현재 로그인한 유저 정보
router.get("/me", requireAuth, getCurrentUser);

// 전체 유저 목록 (관리용이라면 인증을 요구하는 것이 안전함)
router.get("/", requireAuth, listUsers);
