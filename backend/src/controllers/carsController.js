import mongoose from "mongoose";
import { Car } from "../models/index.js";
import { seedFleet } from "../data/seedFleet.js";

export async function getCars(req, res, next) {
  try {
    const cars = await Car.find().sort({ createdAt: -1 });
    res.json({ data: cars });
  } catch (error) {
    next(error);
  }
}

export async function getAvailableCars(req, res, next) {
  try {
    const { startDate, endDate } = req.query;
    
    // Récupérer toutes les voitures
    const cars = await Car.find().sort({ createdAt: -1 });
    
    // Si des dates sont fournies, calculer la disponibilité pour chaque voiture
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        const err = new Error("Invalid date format");
        err.status = 400;
        throw err;
      }
      
      // Récupérer toutes les réservations et blocages qui chevauchent les dates
      const { Reservation, BlockedPeriod } = await import("../models/index.js");
      
      const conflictingReservations = await Reservation.find({
        status: { $in: ["PENDING", "CONFIRMED", "ACTIVE"] },
        startDate: { $lte: end },
        endDate: { $gte: start },
      }).distinct("car");
      
      const blockedCars = await BlockedPeriod.find({
        startDate: { $lte: end },
        endDate: { $gte: start },
      }).distinct("car");
      
      // Combiner les IDs indisponibles
      const unavailableCarIds = [
        ...conflictingReservations.map(id => id.toString()),
        ...blockedCars.map(id => id.toString()),
      ];
      
      // Ajouter le flag isAvailable à chaque voiture
      const carsWithAvailability = await Promise.all(cars.map(async car => {
        const carObj = car.toObject();
        const isUnavailable = unavailableCarIds.includes(car._id.toString());
        carObj.isAvailable = !isUnavailable;
        
        // Si la voiture est indisponible, calculer la prochaine date de disponibilité
        if (isUnavailable) {
          // Récupérer toutes les réservations et blocages pour cette voiture
          const allReservations = await Reservation.find({
            car: car._id,
            status: { $in: ["PENDING", "CONFIRMED", "ACTIVE"] },
            endDate: { $gte: start },
          }).sort({ endDate: -1 });
          
          const allBlocked = await BlockedPeriod.find({
            car: car._id,
            endDate: { $gte: start },
          }).sort({ endDate: -1 });
          
          // Trouver la date de fin la plus tardive
          const allEndDates = [
            ...allReservations.map(r => r.endDate),
            ...allBlocked.map(b => b.endDate),
          ];
          
          if (allEndDates.length > 0) {
            const latestEndDate = new Date(Math.max(...allEndDates.map(d => d.getTime())));
            // La prochaine date disponible est le jour suivant
            const nextAvailable = new Date(latestEndDate);
            nextAvailable.setDate(nextAvailable.getDate() + 1);
            carObj.nextAvailableDate = nextAvailable.toISOString().split('T')[0];
          }
        }
        
        return carObj;
      }));
      
      return res.json({ data: carsWithAvailability });
    }
    
    // Sans dates, toutes les voitures sont considérées disponibles
    const carsWithAvailability = cars.map(car => {
      const carObj = car.toObject();
      carObj.isAvailable = car.status === "DISPONIBLE";
      return carObj;
    });
    
    res.json({ data: carsWithAvailability });
  } catch (error) {
    next(error);
  }
}

export async function getCarById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error("Invalid car id");
      err.status = 400;
      throw err;
    }

    const car = await Car.findById(id);
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

export async function seedCars(req, res, next) {
  try {
    const syncResult = await Car.bulkWrite(
      seedFleet.map((car) => ({
        updateOne: {
          filter: { licensePlate: car.licensePlate },
          update: { $set: car },
          upsert: true,
        },
      }))
    );

    res.json({
      data: {
        totalSeeded: seedFleet.length,
        inserted: syncResult.upsertedCount,
        updated: syncResult.modifiedCount,
        matched: syncResult.matchedCount,
      },
    });
  } catch (error) {
    next(error);
  }
}