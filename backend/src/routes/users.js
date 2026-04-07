import express from "express";
import { getProfile, updateProfile } from "../controllers/userController.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = express.Router();

// GET /api/users/profile - Récupérer le profil de l'utilisateur connecté
router.get("/profile", authMiddleware, getProfile);

// PUT /api/users/profile - Mettre à jour le profil de l'utilisateur connecté
router.put("/profile", authMiddleware, updateProfile);

export default router;
