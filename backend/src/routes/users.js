import express from "express";
import { getProfile, updateProfile, uploadMyDocument } from "../controllers/userController.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = express.Router();

// GET /api/users/profile - Récupérer le profil de l'utilisateur connecté
router.get("/profile", authMiddleware, getProfile);

// PUT /api/users/profile - Mettre à jour le profil de l'utilisateur connecté
router.put("/profile", authMiddleware, updateProfile);

// POST /api/users/documents/:docType - Upload a KYC document
router.post("/documents/:docType", authMiddleware, uploadMyDocument);

export default router;
