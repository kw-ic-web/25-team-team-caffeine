import { Router } from "express";

import {
  listMyPets,
  createPet,
  updatePet,
  deletePet,
} from "../controllers/pets.controller";
import { requireAuth } from "../middleware/auth";

export const router = Router();

router.get("/", requireAuth, listMyPets);
router.post("/", requireAuth, createPet);
router.patch("/:id", requireAuth, updatePet);
router.delete("/:id", requireAuth, deletePet);
