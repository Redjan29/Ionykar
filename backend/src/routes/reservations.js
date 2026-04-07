import express from "express";
import rateLimit from "express-rate-limit";
import {
  cancelMyReservation,
  createReservation,
  deleteReservation,
  getMyReservations,
  getReservationById,
  updateReservation,
} from "../controllers/reservationsController.js";
import { authMiddleware, adminMiddleware } from "../middlewares/auth.js";

const router = express.Router();

const reservationCreationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { status: 429, message: "Too many reservation attempts, please try again later." } },
  skip: () => process.env.NODE_ENV === "development",
});

router.post("/", reservationCreationLimiter, createReservation);
router.get("/my", authMiddleware, getMyReservations);
router.patch("/my/:id/cancel", authMiddleware, cancelMyReservation);
router.get("/:id", authMiddleware, getReservationById);
router.put("/:id", authMiddleware, adminMiddleware, updateReservation);
router.delete("/:id", authMiddleware, adminMiddleware, deleteReservation);

export default router;
