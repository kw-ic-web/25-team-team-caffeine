import { Router } from "express";

import { getMyPowder, updateMyPowder } from "../controllers/userPowder.controller";
import { requireAuth } from "../middleware/auth";

export const router = Router();

router.get("/", requireAuth, getMyPowder);
router.post("/", requireAuth, updateMyPowder);
