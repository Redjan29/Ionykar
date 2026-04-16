import express from "express";
import rateLimit from "express-rate-limit";
import {
  register,
  login,
  getProfile,
  activateAccount,
  logout,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { status: 429, message: "Too many requests, please try again later." } },
});

// Routes publiques
router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/activate-account", authLimiter, activateAccount);
router.post("/verify-email", authLimiter, verifyEmail);
router.post("/resend-verification", authLimiter, resendVerification);
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password", authLimiter, resetPassword);
router.post("/logout", logout);

// Routes protégées (nécessitent un token)
router.get("/profile", authMiddleware, getProfile);

export default router;
