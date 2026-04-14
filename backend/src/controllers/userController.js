import { User, Invoice, CreditNote } from "../models/index.js";
import multer from "multer";
import path from "path";
import fs from "fs/promises";

const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const USER_DOC_TYPES = new Set([
  "profilePhoto",
  "driverLicensePhoto",
  "driverLicenseFront",
  "driverLicenseBack",
  "idCardFront",
  "idCardBack",
  "selfieWithLicense",
  "proofOfResidence",
]);

const userDocsStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const userId = String(req.user?.userId || "unknown");
      const uploadDir = path.resolve(process.cwd(), "uploads", "users", userId);
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase() || ".bin";
    const safeExtension = [".jpg", ".jpeg", ".png", ".webp", ".pdf"].includes(extension)
      ? extension
      : ".bin";
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExtension}`);
  },
});

const uploadUserDocMiddleware = multer({
  storage: userDocsStorage,
  limits: {
    fileSize: 6 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_UPLOAD_MIME_TYPES.has(file.mimetype)) {
      cb(new Error("Only images (JPG/PNG/WEBP) or PDF are allowed"));
      return;
    }
    cb(null, true);
  },
}).single("file");

// Récupérer le profil de l'utilisateur connecté
export async function getProfile(req, res, next) {
  try {
    const userId = req.user.userId;
    
    const user = await User.findById(userId)
      .select("-password")
      .lean({ virtuals: true });
    
    if (!user) {
      const err = new Error("User not found");
      err.status = 404;
      throw err;
    }
    
    res.json({ data: user });
  } catch (error) {
    next(error);
  }
}

// Mettre à jour le profil de l'utilisateur connecté
export async function updateProfile(req, res, next) {
  try {
    const userId = req.user.userId;
    const {
      phone,
      address,
      licenseObtainedDate,
      licenseExpiry,
      licenseNumber,
    } = req.body;
    
    // Construire l'objet de mise à jour avec seulement les champs fournis
    const updateData = {};
    
    if (phone !== undefined) updateData.phone = phone;
    if (licenseNumber !== undefined) updateData.licenseNumber = licenseNumber;
    if (licenseExpiry !== undefined) updateData.licenseExpiry = licenseExpiry;
    if (licenseObtainedDate !== undefined) updateData.licenseObtainedDate = licenseObtainedDate;
    // Documents are uploaded via multipart endpoint; keep legacy base64 fields unchanged here.
    
    // Gérer l'adresse séparément car c'est un objet
    if (address) {
      updateData.address = {};
      if (address.street !== undefined) updateData["address.street"] = address.street;
      if (address.city !== undefined) updateData["address.city"] = address.city;
      if (address.zipCode !== undefined) updateData["address.zipCode"] = address.zipCode;
      if (address.country !== undefined) updateData["address.country"] = address.country;
      delete updateData.address; // On utilise la notation dot pour mettre à jour les sous-champs
    }
    
    // Vérification optionnelle : permis obtenu depuis au moins 1 an
    if (licenseObtainedDate) {
      const obtainedDate = new Date(licenseObtainedDate);
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      if (obtainedDate > oneYearAgo) {
        // Ne pas bloquer, juste informer (sera géré côté frontend)
        // Pour le moment on accepte quand même
      }
    }
    
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .select("-password")
      .lean({ virtuals: true });
    
    if (!user) {
      const err = new Error("User not found");
      err.status = 404;
      throw err;
    }
    
    res.json({ data: user });
  } catch (error) {
    next(error);
  }
}

// Upload a user KYC document (multipart/form-data)
export function uploadMyDocument(req, res, next) {
  uploadUserDocMiddleware(req, res, async (error) => {
    try {
      if (error) {
        error.status = error.status || 413;
        throw error;
      }

      const { docType } = req.params;
      if (!USER_DOC_TYPES.has(String(docType))) {
        const err = new Error("Invalid document type");
        err.status = 400;
        throw err;
      }

      const file = req.file;
      if (!file) {
        const err = new Error("file is required");
        err.status = 400;
        throw err;
      }

      const userId = req.user.userId;
      const url = `/uploads/users/${userId}/${file.filename}`;
      const now = new Date();

      const updates = {
        [`kyc.${docType}.url`]: url,
        [`kyc.${docType}.status`]: "PENDING",
        [`kyc.${docType}.rejectedReason`]: undefined,
        [`kyc.${docType}.updatedAt`]: now,
      };

      const updated = await User.findByIdAndUpdate(
        userId,
        { $set: updates, $unset: { [`kyc.${docType}.rejectedReason`]: "" } },
        { new: true, runValidators: true }
      )
        .select("-password")
        .lean({ virtuals: true });

      res.json({ data: updated, uploaded: { docType, url } });
    } catch (err) {
      next(err);
    }
  });
}

export async function listMyInvoices(req, res, next) {
  try {
    const userId = req.user.userId;
    const invoices = await Invoice.find({ user: userId })
      .sort({ issuedAt: -1, createdAt: -1 })
      .populate({ path: "reservation", populate: { path: "car", select: "brand model licensePlate" } });
    res.json({ data: invoices });
  } catch (error) {
    next(error);
  }
}

export async function downloadMyInvoicePdf(req, res, next) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const invoice = await Invoice.findOne({ _id: id, user: userId });
    if (!invoice) {
      const err = new Error("Invoice not found");
      err.status = 404;
      throw err;
    }
    if (!invoice.pdfUrl) {
      const err = new Error("Invoice PDF not available");
      err.status = 404;
      throw err;
    }
    res.redirect(invoice.pdfUrl);
  } catch (error) {
    next(error);
  }
}

export async function listMyCreditNotes(req, res, next) {
  try {
    const userId = req.user.userId;
    const creditNotes = await CreditNote.find({ user: userId })
      .sort({ issuedAt: -1, createdAt: -1 })
      .populate("invoice", "invoiceNumber")
      .populate({ path: "reservation", populate: { path: "car", select: "brand model licensePlate" } });
    res.json({ data: creditNotes });
  } catch (error) {
    next(error);
  }
}

export async function downloadMyCreditNotePdf(req, res, next) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const creditNote = await CreditNote.findOne({ _id: id, user: userId });
    if (!creditNote) {
      const err = new Error("Credit note not found");
      err.status = 404;
      throw err;
    }
    if (!creditNote.pdfUrl) {
      const err = new Error("Credit note PDF not available");
      err.status = 404;
      throw err;
    }
    res.redirect(creditNote.pdfUrl);
  } catch (error) {
    next(error);
  }
}
