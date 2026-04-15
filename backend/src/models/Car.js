import mongoose from "mongoose";

const carSchema = new mongoose.Schema(
  {
    fleeteeId: {
      type: String,
      maxlength: 100,
    },
    brand: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    model: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    slug: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      maxlength: 140,
      index: true,
    },
    category: {
      type: String,
      enum: ["CITADINE", "BREAK", "BERLINE", "SUV", "LUXE"],
      required: true,
      index: true,
    },
    year: {
      type: Number,
      required: true,
      min: 1900,
      max: 2100,
    },
    licensePlate: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: 20,
      index: true,
    },
    pricePerDay: {
      type: Number,
      required: true,
      min: 0,
    },
    // New pricing model: weekday vs weekend
    priceWeekday: {
      type: Number,
      min: 0,
      default: 0,
    },
    priceWeekend: {
      type: Number,
      min: 0,
      default: 0,
    },
    purchasePrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    registrationCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    initialOtherCosts: {
      type: Number,
      default: 0,
      min: 0,
    },
    seats: {
      type: Number,
      required: true,
      min: 1,
      max: 50,
    },
    doors: {
      type: Number,
      min: 1,
      max: 10,
      default: 5,
    },
    luggage: {
      type: Number,
      required: true,
      min: 0,
      max: 20,
    },
    transmission: {
      type: String,
      enum: ["Manuel", "Auto"],
      required: true,
    },
    fuel: {
      type: String,
      enum: ["Essence", "Diesel", "Électrique", "Hybride"],
      required: true,
    },
    imageUrl: {
      type: String,
      maxlength: 500,
    },
    imageUrls: [
      {
        type: String,
        maxlength: 500,
      },
    ],
    color: {
      type: String,
      trim: true,
      maxlength: 60,
    },
    description: {
      type: String,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ["DISPONIBLE", "RESERVATION", "MAINTENANCE", "INDISPONIBLE"],
      default: "DISPONIBLE",
      index: true,
    },
    mileage: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastMaintenance: {
      type: Date,
    },
    reservations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Reservation",
      },
    ],
  },
  { timestamps: true, toJSON: { virtuals: true, versionKey: false } }
);

export const Car = mongoose.model("Car", carSchema);
