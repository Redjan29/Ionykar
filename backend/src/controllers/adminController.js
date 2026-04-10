import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import {
  Car,
  Reservation,
  User,
  BlockedPeriod,
  MaintenanceRecord,
  FinanceCharge,
} from "../models/index.js";

const KYC_STATUSES = new Set(["MISSING", "PENDING", "APPROVED", "REJECTED"]);
const USER_DOC_TYPES = new Set([
  "profilePhoto",
  "driverLicensePhoto",
  "selfieWithLicense",
  "proofOfResidence",
]);

const MAINTENANCE_CATEGORIES = [
  "REVISION",
  "VIDANGE",
  "PNEUS",
  "CARROSSERIE",
  "PARE_BRISE",
  "FREINS",
  "BATTERIE",
  "CONTROLE_TECHNIQUE",
  "NETTOYAGE",
  "ASSURANCE",
  "AUTRE",
];

const FINANCE_CHARGE_CATEGORIES = [
  "ENTRETIEN",
  "REPARATION",
  "PNEUS",
  "CONTROLE_TECHNIQUE",
  "ASSURANCE",
  "PARKING_MENSUEL",
  "BOITIER_TELEMATIQUE",
  "AUTRE",
];

const FINANCE_FREQUENCIES = ["PONCTUELLE", "MENSUELLE"];

const VALIDATED_REVENUE_STATUSES = ["CONFIRMED", "ACTIVE", "COMPLETED"];
const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const carImageStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const uploadDir = path.resolve(process.cwd(), "uploads", "cars");
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    const safeExtension = [".jpg", ".jpeg", ".png", ".webp"].includes(extension)
      ? extension
      : ".jpg";
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExtension}`);
  },
});

const uploadCarImagesMiddleware = multer({
  storage: carImageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 10,
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_UPLOAD_MIME_TYPES.has(file.mimetype)) {
      cb(new Error("Only JPG, PNG and WEBP images are allowed"));
      return;
    }
    cb(null, true);
  },
}).array("images", 10);

function normalizeAmount(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    const err = new Error(`${fieldName} must be a non-negative number`);
    err.status = 400;
    throw err;
  }
  return parsed;
}

function getMonthsCount(startDate, endDate = new Date()) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return 0;
  }

  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
}

function getFinancePeriodBounds({ year, month }) {
  if (year === undefined || year === null || year === "") {
    return null;
  }

  const normalizedYear = Number(year);
  if (!Number.isInteger(normalizedYear) || normalizedYear < 2000 || normalizedYear > 2100) {
    const err = new Error("Invalid finance year");
    err.status = 400;
    throw err;
  }

  if (month === undefined || month === null || month === "") {
    return {
      start: new Date(normalizedYear, 0, 1),
      end: new Date(normalizedYear + 1, 0, 1),
      year: normalizedYear,
      month: null,
    };
  }

  const normalizedMonth = Number(month);
  if (!Number.isInteger(normalizedMonth) || normalizedMonth < 1 || normalizedMonth > 12) {
    const err = new Error("Invalid finance month");
    err.status = 400;
    throw err;
  }

  return {
    start: new Date(normalizedYear, normalizedMonth - 1, 1),
    end: new Date(normalizedYear, normalizedMonth, 1),
    year: normalizedYear,
    month: normalizedMonth,
  };
}

function getOverlappingMonthCount(chargeDate, rangeStart, rangeEnd) {
  const start = new Date(chargeDate);
  const overlapStart = start > rangeStart ? start : rangeStart;
  const overlapEnd = rangeEnd;

  if (Number.isNaN(overlapStart.getTime()) || Number.isNaN(overlapEnd.getTime()) || overlapStart >= overlapEnd) {
    return 0;
  }

  return (overlapEnd.getFullYear() - overlapStart.getFullYear()) * 12 + (overlapEnd.getMonth() - overlapStart.getMonth()) + 1;
}

function computeChargeTotal(charge, untilDate = new Date()) {
  if (!charge?.isActive) {
    return 0;
  }

  const amount = Number(charge.amount) || 0;
  if (charge.frequency === "MENSUELLE") {
    return amount * getMonthsCount(charge.date, untilDate);
  }

  return amount;
}

function computeChargeTotalForPeriod(charge, periodBounds) {
  if (!periodBounds) {
    return computeChargeTotal(charge);
  }

  if (!charge?.isActive) {
    return 0;
  }

  const amount = Number(charge.amount) || 0;
  const chargeDate = new Date(charge.date);
  const { start, end } = periodBounds;

  if (Number.isNaN(chargeDate.getTime()) || chargeDate >= end) {
    return 0;
  }

  if (charge.frequency === "MENSUELLE") {
    return amount * Math.max(0, getOverlappingMonthCount(chargeDate, start, end));
  }

  return chargeDate >= start && chargeDate < end ? amount : 0;
}

async function buildFinanceReport({ carId, year, month } = {}) {
  const periodBounds = getFinancePeriodBounds({ year, month });
  const carFilter = {};
  if (carId) {
    if (!mongoose.Types.ObjectId.isValid(carId)) {
      const err = new Error("Invalid car ID");
      err.status = 400;
      throw err;
    }
    carFilter._id = new mongoose.Types.ObjectId(carId);
  }

  const cars = await Car.find(carFilter).sort({ createdAt: -1 });
  const carIds = cars.map((car) => car._id);

  if (carIds.length === 0) {
    return {
      generatedAt: new Date().toISOString(),
      vehicles: [],
      totals: {
        investmentTotal: 0,
        revenueTotal: 0,
        manualChargesTotal: 0,
        maintenanceChargesTotal: 0,
        chargesTotal: 0,
        netProfit: 0,
      },
    };
  }

  const revenueMatch = {
    car: { $in: carIds },
    status: { $in: VALIDATED_REVENUE_STATUSES },
  };
  if (periodBounds) {
    revenueMatch.startDate = { $gte: periodBounds.start, $lt: periodBounds.end };
  }

  const maintenanceMatch = {
    car: { $in: carIds },
  };
  if (periodBounds) {
    maintenanceMatch.date = { $gte: periodBounds.start, $lt: periodBounds.end };
  }

  const manualChargesFilter = {
    car: { $in: carIds },
    isActive: true,
  };
  if (periodBounds) {
    manualChargesFilter.date = { $lt: periodBounds.end };
  }

  const [revenueAgg, maintenanceAgg, manualCharges, reservationsCountAgg] = await Promise.all([
    Reservation.aggregate([
      {
        $match: revenueMatch,
      },
      {
        $group: {
          _id: "$car",
          revenueTotal: { $sum: "$totalPrice" },
        },
      },
    ]),
    MaintenanceRecord.aggregate([
      {
        $match: maintenanceMatch,
      },
      {
        $group: {
          _id: "$car",
          maintenanceTotal: { $sum: "$cost" },
        },
      },
    ]),
    FinanceCharge.find(manualChargesFilter),
    Reservation.aggregate([
      {
        $match: revenueMatch,
      },
      {
        $group: {
          _id: "$car",
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const revenueMap = new Map(revenueAgg.map((item) => [String(item._id), Number(item.revenueTotal) || 0]));
  const maintenanceMap = new Map(maintenanceAgg.map((item) => [String(item._id), Number(item.maintenanceTotal) || 0]));
  const reservationCountMap = new Map(reservationsCountAgg.map((item) => [String(item._id), Number(item.count) || 0]));

  const manualChargeMap = new Map();
  manualCharges.forEach((charge) => {
    const key = String(charge.car);
    const existing = manualChargeMap.get(key) || 0;
    manualChargeMap.set(key, existing + computeChargeTotalForPeriod(charge, periodBounds));
  });

  const vehicles = cars.map((car) => {
    const key = String(car._id);
    const purchasePrice = Number(car.purchasePrice) || 0;
    const registrationCost = Number(car.registrationCost) || 0;
    const initialOtherCosts = Number(car.initialOtherCosts) || 0;
    const initialInvestment = purchasePrice + registrationCost + initialOtherCosts;
    const revenue = revenueMap.get(key) || 0;
    const maintenanceChargesTotal = maintenanceMap.get(key) || 0;
    const manualChargesTotal = manualChargeMap.get(key) || 0;
    const chargesTotal = initialInvestment + maintenanceChargesTotal + manualChargesTotal;
    const netProfit = revenue - chargesTotal;

    return {
      carId: car._id,
      brand: car.brand,
      model: car.model,
      licensePlate: car.licensePlate,
      category: car.category,
      purchasePrice,
      registrationCost,
      initialOtherCosts,
      initialInvestment,
      revenue,
      manualCharges: manualChargesTotal,
      maintenanceCharges: maintenanceChargesTotal,
      chargesTotal,
      netProfit,
      reservationsCount: reservationCountMap.get(key) || 0,
    };
  });

  const totals = vehicles.reduce(
    (accumulator, vehicle) => {
      accumulator.investmentTotal += vehicle.initialInvestment;
      accumulator.revenueTotal += vehicle.revenue;
      accumulator.manualChargesTotal += vehicle.manualCharges;
      accumulator.maintenanceChargesTotal += vehicle.maintenanceCharges;
      accumulator.chargesTotal += vehicle.chargesTotal;
      accumulator.netProfit += vehicle.netProfit;
      return accumulator;
    },
    {
      investmentTotal: 0,
      revenueTotal: 0,
      manualChargesTotal: 0,
      maintenanceChargesTotal: 0,
      chargesTotal: 0,
      netProfit: 0,
    }
  );

  return {
    generatedAt: new Date().toISOString(),
    period: periodBounds
      ? {
          year: periodBounds.year,
          month: periodBounds.month,
        }
      : null,
    vehicles,
    totals,
  };
}

export async function getFinanceProfitability(req, res, next) {
  try {
    const report = await buildFinanceReport({
      carId: req.query.carId,
      year: req.query.year,
      month: req.query.month,
    });
    res.json({ data: report });
  } catch (error) {
    next(error);
  }
}

export async function getFinanceSummary(req, res, next) {
  try {
    const periodBounds = getFinancePeriodBounds({ year: req.query.year, month: req.query.month });
    const report = await buildFinanceReport({ year: req.query.year, month: req.query.month });

    const manualChargesFilter = {
      isActive: true,
    };
    if (periodBounds) {
      manualChargesFilter.date = { $lt: periodBounds.end };
    }

    const manualChargesForSummary = await FinanceCharge.find(manualChargesFilter);
    const categoryAccumulator = manualChargesForSummary.reduce((accumulator, charge) => {
      const key = charge.category || "AUTRE";
      const existing = accumulator.get(key) || {
        category: key,
        totalAmountBase: 0,
        totalAmountComputed: 0,
        count: 0,
      };

      existing.totalAmountBase += Number(charge.amount) || 0;
      existing.totalAmountComputed += computeChargeTotalForPeriod(charge, periodBounds);
      existing.count += 1;

      accumulator.set(key, existing);
      return accumulator;
    }, new Map());

    const manualChargesByCategory = Array.from(categoryAccumulator.values()).sort(
      (left, right) => right.totalAmountComputed - left.totalAmountComputed
    );

    res.json({
      data: {
        generatedAt: report.generatedAt,
        period: report.period,
        totals: report.totals,
        vehiclesCount: report.vehicles.length,
        profitableVehicles: report.vehicles.filter((vehicle) => vehicle.netProfit >= 0).length,
        lossMakingVehicles: report.vehicles.filter((vehicle) => vehicle.netProfit < 0).length,
        manualChargesByCategory,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getFinanceCharges(req, res, next) {
  try {
    const { carId, category, frequency, year, month } = req.query;
    const periodBounds = getFinancePeriodBounds({ year, month });
    const filters = { isActive: true };

    if (carId) {
      if (!mongoose.Types.ObjectId.isValid(carId)) {
        const err = new Error("Invalid car ID");
        err.status = 400;
        throw err;
      }
      filters.car = carId;
    }

    if (category) {
      if (!FINANCE_CHARGE_CATEGORIES.includes(category)) {
        const err = new Error("Invalid finance charge category");
        err.status = 400;
        throw err;
      }
      filters.category = category;
    }

    if (frequency) {
      if (!FINANCE_FREQUENCIES.includes(frequency)) {
        const err = new Error("Invalid frequency");
        err.status = 400;
        throw err;
      }
      filters.frequency = frequency;
    }

    if (periodBounds) {
      filters.date = { $lt: periodBounds.end };
    }

    const charges = await FinanceCharge.find(filters)
      .sort({ date: -1, createdAt: -1 })
      .populate("car", "brand model licensePlate category");

    const enrichedCharges = charges.map((charge) => ({
      ...charge.toObject(),
      computedTotal: computeChargeTotalForPeriod(charge, periodBounds),
    })).filter((charge) => charge.computedTotal > 0);

    res.json({
      data: enrichedCharges,
      meta: {
        period: periodBounds
          ? { year: periodBounds.year, month: periodBounds.month }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function createFinanceCharge(req, res, next) {
  try {
    const { carId, category, amount, date, frequency = "PONCTUELLE", description } = req.body;

    if (!mongoose.Types.ObjectId.isValid(carId)) {
      const err = new Error("Invalid car ID");
      err.status = 400;
      throw err;
    }

    if (!FINANCE_CHARGE_CATEGORIES.includes(category)) {
      const err = new Error("Invalid finance charge category");
      err.status = 400;
      throw err;
    }

    if (!FINANCE_FREQUENCIES.includes(frequency)) {
      const err = new Error("Invalid frequency");
      err.status = 400;
      throw err;
    }

    const parsedDate = new Date(date);
    if (!date || Number.isNaN(parsedDate.getTime())) {
      const err = new Error("Invalid charge date");
      err.status = 400;
      throw err;
    }

    const parsedAmount = normalizeAmount(amount, "amount");

    const car = await Car.findById(carId);
    if (!car) {
      const err = new Error("Car not found");
      err.status = 404;
      throw err;
    }

    const charge = await FinanceCharge.create({
      car: carId,
      category,
      amount: parsedAmount,
      date: parsedDate,
      frequency,
      description,
      isActive: true,
    });

    const populated = await FinanceCharge.findById(charge._id).populate(
      "car",
      "brand model licensePlate category"
    );

    res.status(201).json({
      data: {
        ...populated.toObject(),
        computedTotal: computeChargeTotal(populated),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteFinanceCharge(req, res, next) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error("Invalid finance charge ID");
      err.status = 400;
      throw err;
    }

    const deleted = await FinanceCharge.findByIdAndDelete(id);
    if (!deleted) {
      const err = new Error("Finance charge not found");
      err.status = 404;
      throw err;
    }

    res.json({ data: { deleted: true } });
  } catch (error) {
    next(error);
  }
}

export async function updateCarInvestment(req, res, next) {
  try {
    const { carId } = req.params;
    const { purchasePrice = 0, registrationCost = 0, initialOtherCosts = 0 } = req.body;

    if (!mongoose.Types.ObjectId.isValid(carId)) {
      const err = new Error("Invalid car ID");
      err.status = 400;
      throw err;
    }

    const car = await Car.findByIdAndUpdate(
      carId,
      {
        purchasePrice: normalizeAmount(purchasePrice, "purchasePrice"),
        registrationCost: normalizeAmount(registrationCost, "registrationCost"),
        initialOtherCosts: normalizeAmount(initialOtherCosts, "initialOtherCosts"),
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!car) {
      const err = new Error("Car not found");
      err.status = 404;
      throw err;
    }

    res.json({ data: car });
  } catch (error) {
    next(error);
  }
}

function getYearBounds(yearValue) {
  const year = Number(yearValue);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    const err = new Error("Invalid year");
    err.status = 400;
    throw err;
  }

  return {
    start: new Date(year, 0, 1),
    end: new Date(year + 1, 0, 1),
    year,
  };
}

// Statistiques du dashboard
export async function getDashboardStats(req, res, next) {
  try {
    // Stats réservations par statut
    const reservationsByStatus = await Reservation.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Réservations qui commencent aujourd'hui
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayPickups = await Reservation.countDocuments({
      startDate: { $gte: today, $lt: tomorrow },
    });

    const todayReturns = await Reservation.countDocuments({
      endDate: { $gte: today, $lt: tomorrow },
    });

    // Stats utilisateurs
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ hasPassword: true });
    const guestUsers = await User.countDocuments({ hasPassword: false });

    // Stats voitures
    const totalCars = await Car.countDocuments();
    const availableCars = await Car.countDocuments({ status: "DISPONIBLE" });

    const currentYear = new Date().getFullYear();
    const { start: maintenanceStart, end: maintenanceEnd } = getYearBounds(currentYear);
    const maintenanceStats = await MaintenanceRecord.aggregate([
      {
        $match: {
          date: { $gte: maintenanceStart, $lt: maintenanceEnd },
        },
      },
      {
        $group: {
          _id: null,
          totalCost: { $sum: "$cost" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Dernières réservations (10 dernières)
    const recentReservations = await Reservation.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("user", "firstName lastName email")
      .populate("car", "brand model licensePlate");

    res.json({
      data: {
        reservations: {
          byStatus: reservationsByStatus,
          todayPickups,
          todayReturns,
        },
        users: {
          total: totalUsers,
          active: activeUsers,
          guests: guestUsers,
        },
        cars: {
          total: totalCars,
          available: availableCars,
        },
        maintenance: {
          year: currentYear,
          totalCost: maintenanceStats[0]?.totalCost || 0,
          count: maintenanceStats[0]?.count || 0,
        },
        recent: recentReservations,
      },
    });
  } catch (error) {
    next(error);
  }
}

// Lister toutes les réservations avec filtres
export async function getAllReservations(req, res, next) {
  try {
    const { status, startDate, endDate } = req.query;
    
    const filters = {};
    if (status) {
      filters.status = status;
    }
    if (startDate) {
      filters.startDate = { $gte: new Date(startDate) };
    }
    if (endDate) {
      filters.endDate = { $lte: new Date(endDate) };
    }

    const reservations = await Reservation.find(filters)
      .sort({ createdAt: -1 })
      .populate("user", "firstName lastName email phone licenseNumber")
      .populate("car", "brand model category licensePlate pricePerDay");

    res.json({ data: reservations });
  } catch (error) {
    next(error);
  }
}

// Mettre à jour le statut d'une réservation
export async function updateReservationStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error("Invalid reservation ID");
      err.status = 400;
      throw err;
    }

    const validStatuses = ["PENDING", "CONFIRMED", "ACTIVE", "COMPLETED", "CANCELLED", "IN_PROGRESS"];
    if (!validStatuses.includes(status)) {
      const err = new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
      err.status = 400;
      throw err;
    }

    const normalizedStatus = status === "IN_PROGRESS" ? "ACTIVE" : status;

    const reservation = await Reservation.findById(id);
    if (!reservation) {
      const err = new Error("Reservation not found");
      err.status = 404;
      throw err;
    }

    if (normalizedStatus === "ACTIVE") {
      if (reservation.status !== "CONFIRMED") {
        const err = new Error("Reservation can only be started when status is CONFIRMED");
        err.status = 409;
        throw err;
      }

      const now = new Date();
      const startBoundary = new Date(reservation.startDate);
      startBoundary.setHours(0, 0, 0, 0);
      const endBoundary = new Date(reservation.endDate);
      endBoundary.setHours(23, 59, 59, 999);

      if (now < startBoundary || now > endBoundary) {
        const err = new Error("Reservation can only be started between startDate and endDate");
        err.status = 400;
        throw err;
      }
    }

    reservation.status = normalizedStatus;
    if (notes) {
      reservation.notes = notes;
    }
    await reservation.save();

    // Si confirmé, mettre à jour le statut de la voiture
    if (normalizedStatus === "CONFIRMED") {
      await Car.findByIdAndUpdate(reservation.car, { status: "RESERVATION" }, { runValidators: true });
    } else if (normalizedStatus === "CANCELLED" || normalizedStatus === "COMPLETED") {
      await Car.findByIdAndUpdate(reservation.car, { status: "DISPONIBLE" }, { runValidators: true });
    }

    const updated = await Reservation.findById(id)
      .populate("user", "firstName lastName email")
      .populate("car", "brand model licensePlate");

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
}

// Lister tous les utilisateurs
export async function getAllUsers(req, res, next) {
  try {
    const { hasPassword, isActive } = req.query;
    
    const filters = {};
    if (hasPassword !== undefined) {
      filters.hasPassword = hasPassword === "true";
    }
    if (isActive !== undefined) {
      filters.isActive = isActive === "true";
    }

    const users = await User.find(filters)
      .select("-password")
      .sort({ createdAt: -1 })
      .populate("reservations")
      .lean({ virtuals: true });

    res.json({ data: users });
  } catch (error) {
    next(error);
  }
}

// Admin: validate or reject a specific KYC document for a user
export async function reviewUserDocument(req, res, next) {
  try {
    const { id, docType } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error("Invalid user id");
      err.status = 400;
      throw err;
    }
    if (!USER_DOC_TYPES.has(String(docType))) {
      const err = new Error("Invalid document type");
      err.status = 400;
      throw err;
    }

    const { status, rejectedReason } = req.body || {};
    const normalizedStatus = String(status || "").toUpperCase();
    if (!KYC_STATUSES.has(normalizedStatus)) {
      const err = new Error("Invalid status");
      err.status = 400;
      throw err;
    }

    const now = new Date();
    const setUpdates = {
      [`kyc.${docType}.status`]: normalizedStatus,
      [`kyc.${docType}.reviewedAt`]: now,
    };

    const unsetUpdates = {};
    if (normalizedStatus === "REJECTED") {
      if (!rejectedReason || String(rejectedReason).trim().length < 3) {
        const err = new Error("rejectedReason is required when status is REJECTED");
        err.status = 400;
        throw err;
      }
      setUpdates[`kyc.${docType}.rejectedReason`] = String(rejectedReason).trim().slice(0, 500);
    } else {
      unsetUpdates[`kyc.${docType}.rejectedReason`] = "";
    }

    const updated = await User.findByIdAndUpdate(
      id,
      { $set: setUpdates, ...(Object.keys(unsetUpdates).length ? { $unset: unsetUpdates } : {}) },
      { new: true, runValidators: true }
    )
      .select("-password")
      .lean({ virtuals: true });

    if (!updated) {
      const err = new Error("User not found");
      err.status = 404;
      throw err;
    }

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
}

// Lister toutes les voitures (admin)
export async function getAllCars(req, res, next) {
  try {
    const cars = await Car.find().sort({ createdAt: -1 });
    res.json({ data: cars });
  } catch (error) {
    next(error);
  }
}

// Créer une voiture (admin)
export async function createCar(req, res, next) {
  try {
    const {
      brand,
      model,
      description,
      pricePerDay,
      mileage,
      fuel,
      transmission,
      seats,
      doors,
      luggage,
      licensePlate,
      year,
      color,
      category,
      status,
      imageUrl,
      imageUrls,
    } = req.body;

    const requiredFields = [
      "brand",
      "model",
      "pricePerDay",
      "fuel",
      "transmission",
      "seats",
      "licensePlate",
      "year",
      "category",
    ];

    for (const field of requiredFields) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === "") {
        const err = new Error(`${field} is required`);
        err.status = 400;
        throw err;
      }
    }

    const existingCar = await Car.findOne({ licensePlate: String(licensePlate).toUpperCase().trim() });
    if (existingCar) {
      const err = new Error("A vehicle with this license plate already exists");
      err.status = 409;
      throw err;
    }

    const parsedPrice = Number(pricePerDay);
    const parsedMileage = mileage !== undefined && mileage !== "" ? Number(mileage) : 0;
    const parsedSeats = Number(seats);
    const parsedDoors = doors !== undefined && doors !== "" ? Number(doors) : 5;
    const parsedLuggage = luggage !== undefined && luggage !== "" ? Number(luggage) : 2;
    const parsedYear = Number(year);

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      const err = new Error("pricePerDay must be a positive number");
      err.status = 400;
      throw err;
    }

    if (!Number.isFinite(parsedMileage) || parsedMileage < 0) {
      const err = new Error("mileage must be a non-negative number");
      err.status = 400;
      throw err;
    }

    if (!Number.isInteger(parsedSeats) || parsedSeats <= 0) {
      const err = new Error("seats must be a positive integer");
      err.status = 400;
      throw err;
    }

    if (!Number.isInteger(parsedDoors) || parsedDoors <= 0) {
      const err = new Error("doors must be a positive integer");
      err.status = 400;
      throw err;
    }

    if (!Number.isInteger(parsedLuggage) || parsedLuggage < 0) {
      const err = new Error("luggage must be a non-negative integer");
      err.status = 400;
      throw err;
    }

    if (!Number.isInteger(parsedYear) || parsedYear < 1990) {
      const err = new Error("year must be a valid integer");
      err.status = 400;
      throw err;
    }

    const car = await Car.create({
      brand: String(brand).trim(),
      model: String(model).trim(),
      description: description || "",
      pricePerDay: parsedPrice,
      mileage: parsedMileage,
      fuel,
      transmission,
      seats: parsedSeats,
      doors: parsedDoors,
      luggage: parsedLuggage,
      licensePlate: String(licensePlate).trim().toUpperCase(),
      year: parsedYear,
      color: color || "",
      category,
      status: status || "DISPONIBLE",
      imageUrl: imageUrl || "",
      imageUrls: Array.isArray(imageUrls)
        ? imageUrls.filter((item) => typeof item === "string" && item.trim())
        : [],
    });

    res.status(201).json({ data: car });
  } catch (error) {
    next(error);
  }
}

export function uploadCarImages(req, res, next) {
  uploadCarImagesMiddleware(req, res, (error) => {
    if (error) {
      error.status = error.status || 400;
      next(error);
      return;
    }

    try {
      const files = Array.isArray(req.files) ? req.files : [];
      const urls = files.map((file) => `/uploads/cars/${file.filename}`);
      res.status(201).json({ data: { urls } });
    } catch (err) {
      next(err);
    }
  });
}

// Lister les entretiens et dépenses
export async function getMaintenanceRecords(req, res, next) {
  try {
    const { carId, year, category } = req.query;
    const filters = {};
    const selectedYear = year ? Number(year) : new Date().getFullYear();
    const { start, end, year: normalizedYear } = getYearBounds(selectedYear);

    filters.date = { $gte: start, $lt: end };

    if (carId) {
      if (!mongoose.Types.ObjectId.isValid(carId)) {
        const err = new Error("Invalid car ID");
        err.status = 400;
        throw err;
      }
      filters.car = carId;
    }

    if (category) {
      if (!MAINTENANCE_CATEGORIES.includes(category)) {
        const err = new Error("Invalid maintenance category");
        err.status = 400;
        throw err;
      }
      filters.category = category;
    }

    const records = await MaintenanceRecord.find(filters)
      .sort({ date: -1, createdAt: -1 })
      .populate("car", "brand model licensePlate category");

    const summary = {
      year: normalizedYear,
      totalCost: records.reduce((sum, record) => sum + (record.cost || 0), 0),
      count: records.length,
      byCategory: MAINTENANCE_CATEGORIES.map((currentCategory) => {
        const categoryRecords = records.filter(
          (record) => record.category === currentCategory
        );

        return {
          category: currentCategory,
          totalCost: categoryRecords.reduce(
            (sum, record) => sum + (record.cost || 0),
            0
          ),
          count: categoryRecords.length,
        };
      }).filter((item) => item.count > 0),
      byCar: records.reduce((accumulator, record) => {
        const key = record.car?._id?.toString() || "unknown";
        const label = record.car
          ? `${record.car.brand} ${record.car.model} (${record.car.licensePlate})`
          : "Voiture supprimée";

        if (!accumulator[key]) {
          accumulator[key] = {
            carId: key,
            label,
            totalCost: 0,
            count: 0,
          };
        }

        accumulator[key].totalCost += record.cost || 0;
        accumulator[key].count += 1;
        return accumulator;
      }, {}),
    };

    res.json({
      data: {
        records,
        summary: {
          ...summary,
          byCar: Object.values(summary.byCar).sort((left, right) => right.totalCost - left.totalCost),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

// Créer un entretien / une dépense
export async function createMaintenanceRecord(req, res, next) {
  let session;
  try {
    const { carId, category, date, cost, vendor, mileage, notes, status, durationDays } = req.body;

    if (!mongoose.Types.ObjectId.isValid(carId)) {
      const err = new Error("Invalid car ID");
      err.status = 400;
      throw err;
    }

    if (!MAINTENANCE_CATEGORIES.includes(category)) {
      const err = new Error("Invalid maintenance category");
      err.status = 400;
      throw err;
    }

    if (!date) {
      const err = new Error("date is required");
      err.status = 400;
      throw err;
    }

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      const err = new Error("Invalid maintenance date");
      err.status = 400;
      throw err;
    }

    const parsedCost = Number(cost);
    if (!Number.isFinite(parsedCost) || parsedCost < 0) {
      const err = new Error("cost must be a non-negative number");
      err.status = 400;
      throw err;
    }

    let parsedMileage;
    if (mileage !== undefined && mileage !== null && mileage !== "") {
      parsedMileage = Number(mileage);
      if (!Number.isFinite(parsedMileage) || parsedMileage < 0) {
        const err = new Error("mileage must be a non-negative number");
        err.status = 400;
        throw err;
      }
    }

    let parsedDurationDays = 1;
    if (durationDays !== undefined && durationDays !== null && durationDays !== "") {
      parsedDurationDays = Number(durationDays);
      if (!Number.isFinite(parsedDurationDays) || parsedDurationDays < 0) {
        const err = new Error("durationDays must be a non-negative number");
        err.status = 400;
        throw err;
      }
    }

    const validInterventionStatuses = ["PLANIFIE", "EN_COURS", "TERMINE"];
    const normalizedStatus = status || "PLANIFIE";
    if (!validInterventionStatuses.includes(normalizedStatus)) {
      const err = new Error("Invalid intervention status");
      err.status = 400;
      throw err;
    }

    const maintenanceStartDate = new Date(parsedDate);
    maintenanceStartDate.setHours(0, 0, 0, 0);

    const maintenanceEndDate = new Date(maintenanceStartDate);
    maintenanceEndDate.setDate(
      maintenanceEndDate.getDate() + Math.max(1, parsedDurationDays)
    );

    session = await mongoose.startSession();
    let createdRecordId;

    await session.withTransaction(async () => {
      const car = await Car.findById(carId).session(session);
      if (!car) {
        const err = new Error("Car not found");
        err.status = 404;
        throw err;
      }

      const conflictingReservation = await Reservation.findOne({
        car: carId,
        status: { $in: ["CONFIRMED", "ACTIVE"] },
        startDate: { $lte: maintenanceEndDate },
        endDate: { $gte: maintenanceStartDate },
      }).session(session);

      if (conflictingReservation) {
        const err = new Error("Cannot create maintenance: there is a confirmed reservation during this period");
        err.status = 409;
        throw err;
      }

      const createdRecords = await MaintenanceRecord.create(
        [
          {
            car: carId,
            category,
            date: parsedDate,
            status: normalizedStatus,
            durationDays: parsedDurationDays,
            cost: parsedCost,
            vendor,
            mileage: parsedMileage,
            notes,
          },
        ],
        { session }
      );

      const record = createdRecords[0];
      createdRecordId = record._id;

      const lastMaintenanceDate = !car.lastMaintenance || parsedDate > car.lastMaintenance;
      const carUpdates = {};

      if (lastMaintenanceDate) {
        carUpdates.lastMaintenance = parsedDate;
      }

      if (parsedMileage !== undefined && parsedMileage > (car.mileage || 0)) {
        carUpdates.mileage = parsedMileage;
      }

      if (normalizedStatus === "PLANIFIE" || normalizedStatus === "EN_COURS") {
        carUpdates.status = "MAINTENANCE";
      }

      if (Object.keys(carUpdates).length > 0) {
        await Car.findByIdAndUpdate(carId, carUpdates, { runValidators: true, session });
      }

      const existingBlock = await BlockedPeriod.findOne({
        car: carId,
        startDate: maintenanceStartDate,
        endDate: maintenanceEndDate,
      }).session(session);

      if (!existingBlock) {
        await BlockedPeriod.create(
          [
            {
              car: carId,
              startDate: maintenanceStartDate,
              endDate: maintenanceEndDate,
              reason: `Maintenance: ${category}`,
            },
          ],
          { session }
        );
      }
    });

    const populatedRecord = await MaintenanceRecord.findById(createdRecordId).populate(
      "car",
      "brand model licensePlate category"
    );

    res.status(201).json({ data: populatedRecord });
  } catch (error) {
    next(error);
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

// Supprimer un entretien
export async function deleteMaintenanceRecord(req, res, next) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error("Invalid maintenance record ID");
      err.status = 400;
      throw err;
    }

    const record = await MaintenanceRecord.findByIdAndDelete(id);

    if (!record) {
      const err = new Error("Maintenance record not found");
      err.status = 404;
      throw err;
    }

    res.json({ data: { message: "Maintenance record deleted successfully" } });
  } catch (error) {
    next(error);
  }
}

// Mettre à jour une voiture (admin)
export async function updateCar(req, res, next) {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error("Invalid car ID");
      err.status = 400;
      throw err;
    }

    const allowedFields = [
      "pricePerDay",
      "description",
      "status",
      "seats",
      "doors",
      "luggage",
      "transmission",
      "fuel",
      "imageUrl",
      "imageUrls",
      "color",
      "mileage",
      "category",
      "year",
      "brand",
      "model",
      "licensePlate",
      "purchasePrice",
      "registrationCost",
      "initialOtherCosts",
    ];

    for (const key of Object.keys(updates)) {
      if (!allowedFields.includes(key)) {
        delete updates[key];
      }
    }

    if (updates.pricePerDay !== undefined) {
      updates.pricePerDay = Number(updates.pricePerDay);
      if (!Number.isFinite(updates.pricePerDay) || updates.pricePerDay <= 0) {
        const err = new Error("pricePerDay must be a positive number");
        err.status = 400;
        throw err;
      }
    }

    if (updates.seats !== undefined) {
      updates.seats = Number(updates.seats);
      if (!Number.isInteger(updates.seats) || updates.seats <= 0) {
        const err = new Error("seats must be a positive integer");
        err.status = 400;
        throw err;
      }
    }

    if (updates.luggage !== undefined) {
      updates.luggage = Number(updates.luggage);
      if (!Number.isInteger(updates.luggage) || updates.luggage < 0) {
        const err = new Error("luggage must be a non-negative integer");
        err.status = 400;
        throw err;
      }
    }

    if (updates.doors !== undefined) {
      updates.doors = Number(updates.doors);
      if (!Number.isInteger(updates.doors) || updates.doors <= 0) {
        const err = new Error("doors must be a positive integer");
        err.status = 400;
        throw err;
      }
    }

    if (updates.mileage !== undefined) {
      updates.mileage = Number(updates.mileage);
      if (!Number.isFinite(updates.mileage) || updates.mileage < 0) {
        const err = new Error("mileage must be a non-negative number");
        err.status = 400;
        throw err;
      }
    }

    if (updates.year !== undefined) {
      updates.year = Number(updates.year);
      if (!Number.isInteger(updates.year) || updates.year < 1990) {
        const err = new Error("year must be a valid integer");
        err.status = 400;
        throw err;
      }
    }

    if (updates.purchasePrice !== undefined) {
      updates.purchasePrice = normalizeAmount(updates.purchasePrice, "purchasePrice");
    }

    if (updates.registrationCost !== undefined) {
      updates.registrationCost = normalizeAmount(updates.registrationCost, "registrationCost");
    }

    if (updates.initialOtherCosts !== undefined) {
      updates.initialOtherCosts = normalizeAmount(updates.initialOtherCosts, "initialOtherCosts");
    }

    const car = await Car.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!car) {
      const err = new Error("Car not found");
      err.status = 404;
      throw err;
    }

    res.json({ data: car });
  } catch (error) {
    next(error);
  }
}

// Mettre à jour un utilisateur
export async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error("Invalid user ID");
      err.status = 400;
      throw err;
    }

    // Ne pas permettre de modifier le mot de passe ici
    delete updates.password;
    delete updates.email; // L'email ne peut pas être changé non plus

    const user = await User.findByIdAndUpdate(id, updates, { 
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      const err = new Error("User not found");
      err.status = 404;
      throw err;
    }

    res.json({ data: user });
  } catch (error) {
    next(error);
  }
}

// Récupérer toutes les périodes bloquées d'une voiture
export async function getBlockedPeriods(req, res, next) {
  try {
    const { carId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(carId)) {
      const err = new Error("Invalid car ID");
      err.status = 400;
      throw err;
    }

    const blockedPeriods = await BlockedPeriod.find({ car: carId }).sort({ startDate: 1 });
    res.json({ data: blockedPeriods });
  } catch (error) {
    next(error);
  }
}

// Créer une nouvelle période bloquée
export async function createBlockedPeriod(req, res, next) {
  try {
    const { carId } = req.params;
    const { startDate, endDate, reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(carId)) {
      const err = new Error("Invalid car ID");
      err.status = 400;
      throw err;
    }

    if (!startDate || !endDate) {
      const err = new Error("startDate and endDate are required");
      err.status = 400;
      throw err;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      const err = new Error("endDate must be after startDate");
      err.status = 400;
      throw err;
    }

    // Vérifier qu'il n'y a pas de réservations confirmées sur cette période
    const conflictingReservation = await Reservation.findOne({
      car: carId,
      status: { $in: ["CONFIRMED", "ACTIVE"] },
      startDate: { $lte: end },
      endDate: { $gte: start },
    });

    if (conflictingReservation) {
      const err = new Error("Cannot block period: there is a confirmed reservation during this time");
      err.status = 409;
      throw err;
    }

    const blockedPeriod = await BlockedPeriod.create({
      car: carId,
      startDate: start,
      endDate: end,
      reason: reason || "Indisponibilité temporaire",
    });

    res.status(201).json({ data: blockedPeriod });
  } catch (error) {
    next(error);
  }
}

// Supprimer une période bloquée
export async function deleteBlockedPeriod(req, res, next) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error("Invalid blocked period ID");
      err.status = 400;
      throw err;
    }

    const blockedPeriod = await BlockedPeriod.findByIdAndDelete(id);

    if (!blockedPeriod) {
      const err = new Error("Blocked period not found");
      err.status = 404;
      throw err;
    }

    res.json({ data: { message: "Blocked period deleted successfully" } });
  } catch (error) {
    next(error);
  }
}
