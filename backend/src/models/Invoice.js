import mongoose from "mongoose";

const INVOICE_STATUSES = ["DRAFT", "ISSUED", "CANCELLED"];

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
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
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: INVOICE_STATUSES,
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
    amountNet: {
      type: Number,
      default: 0,
      min: 0,
    },
    vatRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    amountVat: {
      type: Number,
      default: 0,
      min: 0,
    },
    pdfUrl: {
      type: String,
      maxlength: 400,
    },
    meta: {
      companyName: { type: String, maxlength: 120, default: "IonyKar" },
      companyAddress: { type: String, maxlength: 240, default: "" },
      companySiret: { type: String, maxlength: 32, default: "" },
    },
  },
  { timestamps: true }
);

export const Invoice = mongoose.model("Invoice", invoiceSchema);

