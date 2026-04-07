import "dotenv/config";
import { connectDB } from "../config/db.js";
import { Car } from "../models/index.js";
import { seedFleet } from "../data/seedFleet.js";

await connectDB();

const syncResult = await Car.bulkWrite(
  seedFleet.map((car) => ({
    updateOne: {
      filter: { licensePlate: car.licensePlate },
      update: { $set: car },
      upsert: true,
    },
  }))
);

console.log(
  JSON.stringify(
    {
      totalSeeded: seedFleet.length,
      inserted: syncResult.upsertedCount,
      updated: syncResult.modifiedCount,
      matched: syncResult.matchedCount,
    },
    null,
    2
  )
);

process.exit(0);

