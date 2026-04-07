import mongoose from "mongoose";

const maintenanceRecordSchema = new mongoose.Schema(
  {
    car: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Car",
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: [
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
      ],
      required: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["PLANIFIE", "EN_COURS", "TERMINE"],
      default: "PLANIFIE",
      index: true,
    },
    durationDays: {
      type: Number,
      min: 0,
      default: 1,
    },
    cost: {
      type: Number,
      required: true,
      min: 0,
    },
    vendor: {
      type: String,
      trim: true,
    },
    mileage: {
      type: Number,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true, versionKey: false }
);

export const MaintenanceRecord = mongoose.model(
  "MaintenanceRecord",
  maintenanceRecordSchema
);