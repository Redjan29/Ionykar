import mongoose from "mongoose";

const financeChargeSchema = new mongoose.Schema(
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
        "ENTRETIEN",
        "REPARATION",
        "PNEUS",
        "CONTROLE_TECHNIQUE",
        "ASSURANCE",
        "PARKING_MENSUEL",
        "BOITIER_TELEMATIQUE",
        "AUTRE",
      ],
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    frequency: {
      type: String,
      enum: ["PONCTUELLE", "MENSUELLE"],
      default: "PONCTUELLE",
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

export const FinanceCharge = mongoose.model("FinanceCharge", financeChargeSchema);
