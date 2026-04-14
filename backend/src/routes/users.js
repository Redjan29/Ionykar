import express from "express";
import {
  getProfile,
  updateProfile,
  uploadMyDocument,
  listMyInvoices,
  downloadMyInvoicePdf,
  listMyCreditNotes,
  downloadMyCreditNotePdf,
} from "../controllers/userController.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = express.Router();

// GET /api/users/profile - Récupérer le profil de l'utilisateur connecté
router.get("/profile", authMiddleware, getProfile);

// PUT /api/users/profile - Mettre à jour le profil de l'utilisateur connecté
router.put("/profile", authMiddleware, updateProfile);

// POST /api/users/documents/:docType - Upload a KYC document
router.post("/documents/:docType", authMiddleware, uploadMyDocument);

// Factures / avoirs (côté locataire)
router.get("/invoices", authMiddleware, listMyInvoices);
router.get("/invoices/:id/pdf", authMiddleware, downloadMyInvoicePdf);
router.get("/credit-notes", authMiddleware, listMyCreditNotes);
router.get("/credit-notes/:id/pdf", authMiddleware, downloadMyCreditNotePdf);

export default router;
