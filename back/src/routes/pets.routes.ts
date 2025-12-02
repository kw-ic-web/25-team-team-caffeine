import { Router } from "express";

import {
  listMyPets,
  createPet,
  updatePet,
  deletePet,
} from "../controllers/pets.controller.js";
import { requireAuth } from "../middleware/auth.js";

export const router = Router();

router.get("/", requireAuth, listMyPets);
router.post("/", requireAuth, createPet);
router.patch("/:id", requireAuth, updatePet);
router.delete("/:id", requireAuth, deletePet);
