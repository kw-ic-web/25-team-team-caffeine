// back/src/routes/users.routes.ts
import { Router } from "express";
import { getCurrentUser, listUsers, updateCurrentUser } from "../controllers/users.controller";
import { requireAuth } from "../middleware/auth";

export const router = Router();

router.get("/me", requireAuth, getCurrentUser);

router.patch("/me", requireAuth, updateCurrentUser);

router.get("/", requireAuth, listUsers);