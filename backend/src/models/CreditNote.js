import mongoose from "mongoose";

const CREDIT_NOTE_STATUSES = ["ISSUED", "CANCELLED"];

const creditNoteSchema = new mongoose.Schema(
  {
    creditNoteNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reservation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reservation",
      required: true,
      index: true,
    },
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      index: true,
    },
    status: {
      type: String,
      enum: CREDIT_NOTE_STATUSES,
      default: "ISSUED",
      index: true,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    currency: {
      type: String,
      default: "EUR",
      maxlength: 3,
    },
    amountTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    reason: {
      type: String,
      maxlength: 500,
      default: "",
    },
    pdfUrl: {
      type: String,
      maxlength: 400,
    },
  },
  { timestamps: true }
);

export const CreditNote = mongoose.model("CreditNote", creditNoteSchema);

