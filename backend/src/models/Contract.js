import mongoose from "mongoose";

const contractSchema = new mongoose.Schema(
  {
    reservation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reservation",
      required: true,
    },
    contractNumber: {
      type: String,
      unique: true,
      required: true,
    },
    pdfUrl: {
      type: String,
      // URL du PDF stocké (AWS S3, Cloudinary, etc.)
    },
    pdfBuffer: {
      type: Buffer,
      // Ou stocker le PDF directement
    },
    status: {
      type: String,
      enum: ["GENERATED", "SENT", "SIGNED", "ARCHIVED"],
      default: "GENERATED",
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    sentAt: {
      type: Date,
    },
    signedAt: {
      type: Date,
    },
    clientSignature: {
      type: String,
    },
    notes: {
      type: String,
    },
  },
  { timestamps: true }
);

export const Contract = mongoose.model("Contract", contractSchema);
