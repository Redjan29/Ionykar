import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 255,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address",
      ],
      index: true,
    },
    password: {
      type: String,
      required: false,
      select: false, // Ne pas retourner le password par défaut
    },
    hasPassword: {
      type: Boolean,
      default: false,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
    },
    address: {
      street: { type: String, maxlength: 255 },
      city: { type: String, maxlength: 100 },
      zipCode: { type: String, maxlength: 20 },
      country: { type: String, maxlength: 100 },
    },
    profilePhoto: {
      type: String,
      maxlength: 3000000,
    },
    driverLicensePhoto: {
      type: String,
      maxlength: 3000000,
    },
    proofOfResidence: {
      type: String,
      maxlength: 3000000,
    },
    selfieWithLicense: {
      type: String,
      maxlength: 3000000,
    },
    licenseObtainedDate: {
      type: Date,
    },
    licenseNumber: {
      type: String,
      required: false,
      trim: true,
      maxlength: 50,
    },
    licenseExpiry: {
      type: Date,
      required: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    reservations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Reservation",
      },
    ],
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
