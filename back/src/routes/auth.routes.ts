import { Router } from "express";

import { handleGoogleCallback, loginUser, registerUser } from "../controllers/auth.controller";

export const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/google/callback", handleGoogleCallback);
