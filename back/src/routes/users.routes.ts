import { Router } from "express";

import { getCurrentUser, listUsers } from "../controllers/users.controller";

export const router = Router();

router.get("/me", getCurrentUser);
router.get("/", listUsers);
