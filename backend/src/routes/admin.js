import express from "express";
import { authMiddleware, adminMiddleware } from "../middlewares/auth.js";
import {
  getAllReservations,
  updateReservationStatus,
  getAllUsers,
  getDashboardStats,
  updateUser,
  getAllCars,
  createCar,
  updateCar,
  getBlockedPeriods,
  getAllBlockedPeriods,
  createBlockedPeriod,
  deleteBlockedPeriod,
  getMaintenanceRecords,
  createMaintenanceRecord,
  deleteMaintenanceRecord,
  getFinanceProfitability,
  getFinanceSummary,
  getFinanceCharges,
  getFinanceRevenueTimeseries,
  exportFinanceRevenueCsv,
  createFinanceCharge,
  deleteFinanceCharge,
  updateCarInvestment,
  uploadCarImages,
  reviewUserDocument,
  reviewUserProfile,
  listInvoices,
  createInvoiceForReservation,
  downloadInvoicePdf,
  exportInvoicesZip,
  listCreditNotes,
  createCreditNoteForReservation,
  downloadCreditNotePdf,
} from "../controllers/adminController.js";

const router = express.Router();

// Toutes les routes admin nécessitent auth + admin
router.use(authMiddleware, adminMiddleware);

// Dashboard stats
router.get("/stats", getDashboardStats);

// Gestion des réservations
router.get("/reservations", getAllReservations);
router.patch("/reservations/:id/status", updateReservationStatus);

// Gestion des utilisateurs
router.get("/users", getAllUsers);
router.patch("/users/:id", updateUser);
router.patch("/users/:id/documents/:docType", reviewUserDocument);
router.patch("/users/:id/profile-review", reviewUserProfile);

// Gestion des voitures
router.get("/cars", getAllCars);
router.post("/cars", createCar);
router.patch("/cars/:id", updateCar);
router.post("/cars/upload-images", uploadCarImages);

// Gestion des entretiens
router.get("/maintenance-records", getMaintenanceRecords);
router.post("/maintenance-records", createMaintenanceRecord);
router.delete("/maintenance-records/:id", deleteMaintenanceRecord);

// Gestion des périodes bloquées
router.get("/blocks", getAllBlockedPeriods);
router.get("/cars/:carId/blocks", getBlockedPeriods);
router.post("/cars/:carId/blocks", createBlockedPeriod);
router.delete("/blocks/:id", deleteBlockedPeriod);

// Gestion financière
router.get("/finance/profitability", getFinanceProfitability);
router.get("/finance/summary", getFinanceSummary);
router.get("/finance/charges", getFinanceCharges);
router.get("/finance/revenue-timeseries", getFinanceRevenueTimeseries);
router.get("/finance/revenue-timeseries.csv", exportFinanceRevenueCsv);
router.post("/finance/charges", createFinanceCharge);
router.delete("/finance/charges/:id", deleteFinanceCharge);
router.patch("/finance/cars/:carId/investment", updateCarInvestment);

// Factures / avoirs
router.get("/invoices", listInvoices);
router.post("/reservations/:reservationId/invoice", createInvoiceForReservation);
router.get("/invoices/:id/pdf", downloadInvoicePdf);
router.get("/invoices.zip", exportInvoicesZip);

router.get("/credit-notes", listCreditNotes);
router.post("/reservations/:reservationId/credit-note", createCreditNoteForReservation);
router.get("/credit-notes/:id/pdf", downloadCreditNotePdf);

export default router;
