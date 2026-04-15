import mongoose from "mongoose";
import { Car, Reservation, User, BlockedPeriod } from "../models/index.js";

function parseDate(value, label) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const err = new Error(`Invalid ${label}`);
    err.status = 400;
    throw err;
  }
  return date;
}

function calculateDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end - start;
  if (diffMs < 0) {
    const err = new Error("End date must be after start date");
    err.status = 400;
    throw err;
  }
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

function isWeekend(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 Sun ... 6 Sat
  return day === 0 || day === 6;
}

function computeTotalPriceWithWeekendRates({ start, end, priceWeekday, priceWeekend, fallbackPricePerDay }) {
  const weekdayRate = Number(priceWeekday ?? fallbackPricePerDay ?? 0);
  const weekendRate = Number(priceWeekend ?? fallbackPricePerDay ?? 0);
  if (!Number.isFinite(weekdayRate) || weekdayRate <= 0) return null;
  if (!Number.isFinite(weekendRate) || weekendRate <= 0) return null;

  const cursor = new Date(start);
  cursor.setHours(12, 0, 0, 0);
  const endD = new Date(end);
  endD.setHours(12, 0, 0, 0);

  let total = 0;
  let weekdayDays = 0;
  let weekendDays = 0;

  while (cursor <= endD) {
    if (isWeekend(cursor)) {
      weekendDays += 1;
      total += weekendRate;
    } else {
      weekdayDays += 1;
      total += weekdayRate;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return { total, weekdayDays, weekendDays, weekdayRate, weekendRate };
}

export async function createReservation(req, res, next) {
  let session;
  try {
    const {
      carId,
      user,
      startDate,
      endDate,
      startTime = "09:00",
      endTime = "18:00",
      notes,
    } = req.body;

    if (!carId) {
      const err = new Error("carId is required");
      err.status = 400;
      throw err;
    }

    if (!mongoose.Types.ObjectId.isValid(carId)) {
      const err = new Error("Invalid carId");
      err.status = 400;
      throw err;
    }

    if (!user?.email) {
      const err = new Error("User email is required");
      err.status = 400;
      throw err;
    }

    const requiredUserFields = ["firstName", "lastName", "phone"];
    for (const field of requiredUserFields) {
      if (!user?.[field]) {
        const err = new Error(`User ${field} is required`);
        err.status = 400;
        throw err;
      }
    }

    const start = parseDate(startDate, "startDate");
    const end = parseDate(endDate, "endDate");
    const numberOfDays = calculateDays(start, end);

    // Validation de la date d'expiration du permis seulement si fournie
    if (user.licenseExpiry) {
      const licenseExpiryDate = parseDate(user.licenseExpiry, "licenseExpiry");
      if (licenseExpiryDate < end) {
        const err = new Error("Driver's license expires before the end of the rental period");
        err.status = 400;
        throw err;
      }
    }

    session = await mongoose.startSession();
    let createdReservation = null;

    await session.withTransaction(async () => {
      const car = await Car.findById(carId).session(session);
      if (!car) {
        const err = new Error("Car not found");
        err.status = 404;
        throw err;
      }

      // Vérifier que la voiture est disponible (pas en maintenance ou indisponible)
      if (car.status !== "DISPONIBLE") {
        const err = new Error("Car is not available for reservation");
        err.status = 400;
        throw err;
      }

      // Vérifier qu'il n'y a pas de période de blocage
      const blockedPeriod = await BlockedPeriod.findOne({
        car: carId,
        startDate: { $lte: end },
        endDate: { $gte: start },
      }).session(session);

      if (blockedPeriod) {
        const err = new Error(`Car is blocked from ${blockedPeriod.startDate.toLocaleDateString()} to ${blockedPeriod.endDate.toLocaleDateString()}: ${blockedPeriod.reason}`);
        err.status = 409;
        throw err;
      }

      const conflicting = await Reservation.findOne({
        car: carId,
        status: { $in: ["PENDING", "CONFIRMED", "ACTIVE"] },
        startDate: { $lte: end },
        endDate: { $gte: start },
      }).session(session);

      if (conflicting) {
        const err = new Error("Car not available for selected dates");
        err.status = 409;
        throw err;
      }

      let existingUser = await User.findOne({ email: user.email.toLowerCase() }).session(session);
      if (!existingUser) {
        const createdUsers = await User.create(
          [
            {
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              phone: user.phone,
              address: user.address,
              licenseNumber: user.licenseNumber,
              licenseExpiry: user.licenseExpiry,
              hasPassword: false,
            },
          ],
          { session }
        );
        existingUser = createdUsers[0];
      }

      // KYC gate: user must have required docs approved before reserving
      const kyc = existingUser.kyc || {};
      const requiredDocs = ["driverLicensePhoto", "proofOfResidence"];
      const missingApproval = requiredDocs.find((key) => kyc?.[key]?.status !== "APPROVED");
      if (missingApproval) {
        const err = new Error("KYC not approved. Please upload required documents and wait for admin validation.");
        err.status = 403;
        throw err;
      }

      const createdReservations = await Reservation.create(
        [
          {
            user: existingUser._id,
            car: car._id,
            startDate: start,
            endDate: end,
            startTime,
            endTime,
            numberOfDays,
            pricePerDay: car.priceWeekday || car.pricePerDay,
            totalPrice:
              computeTotalPriceWithWeekendRates({
                start,
                end,
                priceWeekday: car.priceWeekday,
                priceWeekend: car.priceWeekend,
                fallbackPricePerDay: car.pricePerDay,
              })?.total ?? numberOfDays * car.pricePerDay,
            notes,
          },
        ],
        { session }
      );

      createdReservation = createdReservations[0];

      await Car.findByIdAndUpdate(
        car._id,
        { $addToSet: { reservations: createdReservation._id } },
        { runValidators: true, session }
      );

      await User.findByIdAndUpdate(
        existingUser._id,
        { $addToSet: { reservations: createdReservation._id } },
        { runValidators: true, session }
      );
    });

    res.status(201).json({ data: createdReservation });
  } catch (error) {
    next(error);
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

export async function getReservationById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error("Invalid reservation id");
      err.status = 400;
      throw err;
    }

    const reservation = await Reservation.findById(id)
      .populate("user", "firstName lastName email phone")
      .populate("car", "brand model category pricePerDay priceWeekday priceWeekend");

    if (!reservation) {
      const err = new Error("Reservation not found");
      err.status = 404;
      throw err;
    }

    res.json({ data: reservation });
  } catch (error) {
    next(error);
  }
}

export async function updateReservation(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error("Invalid reservation id");
      err.status = 400;
      throw err;
    }

    const reservation = await Reservation.findById(id).populate("car", "pricePerDay priceWeekday priceWeekend");
    if (!reservation) {
      const err = new Error("Reservation not found");
      err.status = 404;
      throw err;
    }

    const { startDate, endDate, startTime, endTime, notes } = req.body;
    const updates = {};
    if (startTime !== undefined) updates.startTime = startTime;
    if (endTime !== undefined) updates.endTime = endTime;
    if (notes !== undefined) updates.notes = notes;

    if (startDate || endDate) {
      const start = startDate ? parseDate(startDate, "startDate") : reservation.startDate;
      const end = endDate ? parseDate(endDate, "endDate") : reservation.endDate;
      const numberOfDays = calculateDays(start, end);
      updates.startDate = start;
      updates.endDate = end;
      updates.numberOfDays = numberOfDays;
      updates.totalPrice =
        computeTotalPriceWithWeekendRates({
          start,
          end,
          priceWeekday: reservation.car.priceWeekday,
          priceWeekend: reservation.car.priceWeekend,
          fallbackPricePerDay: reservation.car.pricePerDay,
        })?.total ?? numberOfDays * reservation.car.pricePerDay;
    }

    const updated = await Reservation.findByIdAndUpdate(id, updates, { 
      new: true,
      runValidators: true,
    });
    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
}

export async function deleteReservation(req, res, next) {
  let session;
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error("Invalid reservation id");
      err.status = 400;
      throw err;
    }

    session = await mongoose.startSession();
    let reservation;

    await session.withTransaction(async () => {
      reservation = await Reservation.findByIdAndDelete(id, { session });
      if (!reservation) {
        const err = new Error("Reservation not found");
        err.status = 404;
        throw err;
      }

      await Car.findByIdAndUpdate(
        reservation.car,
        { $pull: { reservations: reservation._id } },
        { runValidators: true, session }
      );

      await User.findByIdAndUpdate(
        reservation.user,
        { $pull: { reservations: reservation._id } },
        { runValidators: true, session }
      );
    });

    res.json({ data: { deleted: true } });
  } catch (error) {
    next(error);
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

export async function getMyReservations(req, res, next) {
  try {
    const userId = req.user?.userId;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      const err = new Error("Invalid user");
      err.status = 401;
      throw err;
    }

    const reservations = await Reservation.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate("car", "brand model category imageUrl licensePlate pricePerDay");

    res.json({ data: reservations });
  } catch (error) {
    next(error);
  }
}

export async function cancelMyReservation(req, res, next) {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      const err = new Error("Invalid user");
      err.status = 401;
      throw err;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error("Invalid reservation id");
      err.status = 400;
      throw err;
    }

    const reservation = await Reservation.findOne({ _id: id, user: userId });
    if (!reservation) {
      const err = new Error("Reservation not found");
      err.status = 404;
      throw err;
    }

    if (reservation.status !== "PENDING") {
      const err = new Error("Only pending reservations can be cancelled");
      err.status = 400;
      throw err;
    }

    reservation.status = "CANCELLED";
    await reservation.save();

    if (reservation.car) {
      await Car.findByIdAndUpdate(reservation.car, { status: "DISPONIBLE" }, { runValidators: true });
    }

    const updatedReservation = await Reservation.findById(reservation._id).populate(
      "car",
      "brand model category imageUrl licensePlate pricePerDay"
    );

    res.json({ data: updatedReservation });
  } catch (error) {
    next(error);
  }
}