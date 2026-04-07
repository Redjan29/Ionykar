import mongoose from "mongoose";

const blockedPeriodSchema = new mongoose.Schema(
  {
    car: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Car",
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      default: "Indisponibilité temporaire",
    },
  },
  { timestamps: true }
);

// Index pour les recherches de conflits
blockedPeriodSchema.index({ car: 1, startDate: 1, endDate: 1 });

export const BlockedPeriod = mongoose.model("BlockedPeriod", blockedPeriodSchema);
