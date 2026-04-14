import mongoose from "mongoose";

const reservationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    car: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Car",
      required: true,
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
    },
    startTime: {
      type: String,
      default: "09:00",
      maxlength: 5,
    },
    endTime: {
      type: String,
      default: "18:00",
      maxlength: 5,
    },
    numberOfDays: {
      type: Number,
      required: true,
      min: 1,
    },
    pricePerDay: {
      type: Number,
      required: true,
      min: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "ACTIVE", "COMPLETED", "CANCELLED"],
      default: "PENDING",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["UNPAID", "PAID", "REFUNDED"],
      default: "UNPAID",
      index: true,
    },
    depositStatus: {
      type: String,
      enum: ["NOT_REQUIRED", "PENDING", "HELD", "RELEASED"],
      default: "PENDING",
      index: true,
    },
    depositAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    notes: {
      type: String,
      maxlength: 1000,
    },
    contract: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contract",
    },
    fleeteeReservationId: {
      type: String,
      maxlength: 100,
    },
  },
  { timestamps: true }
);

export const Reservation = mongoose.model("Reservation", reservationSchema);
