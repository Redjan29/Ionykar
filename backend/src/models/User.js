import mongoose from "mongoose";

const KYC_STATUSES = ["MISSING", "PENDING", "APPROVED", "REJECTED"];

const kycDocumentSchema = new mongoose.Schema(
  {
    url: { type: String, maxlength: 500 },
    status: { type: String, enum: KYC_STATUSES, default: "MISSING", index: true },
    rejectedReason: { type: String, maxlength: 500 },
    updatedAt: { type: Date },
    reviewedAt: { type: Date },
  },
  { _id: false }
);

const kycSchema = new mongoose.Schema(
  {
    profilePhoto: { type: kycDocumentSchema, default: () => ({}) },
    driverLicensePhoto: { type: kycDocumentSchema, default: () => ({}) },
    selfieWithLicense: { type: kycDocumentSchema, default: () => ({}) },
    proofOfResidence: { type: kycDocumentSchema, default: () => ({}) },
  },
  { _id: false }
);

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
    // New KYC model (file uploads stored as URLs; statuses tracked per document)
    kyc: {
      type: kycSchema,
      default: () => ({}),
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

userSchema.virtual("kycApproved").get(function kycApproved() {
  const required = ["driverLicensePhoto", "proofOfResidence"];
  const kyc = this.kyc || {};
  return required.every((key) => kyc?.[key]?.status === "APPROVED");
});

export const User = mongoose.model("User", userSchema);
