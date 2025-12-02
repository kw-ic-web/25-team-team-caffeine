import { Router } from "express";

import { getMyPowder, updateMyPowder } from "../controllers/userPowder.controller.js";
import { requireAuth } from "../middleware/auth.js";

export const router = Router();

router.get("/", requireAuth, getMyPowder);
router.post("/", requireAuth, updateMyPowder);
