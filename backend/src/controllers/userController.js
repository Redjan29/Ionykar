import { User } from "../models/index.js";

// Récupérer le profil de l'utilisateur connecté
export async function getProfile(req, res, next) {
  try {
    const userId = req.user.userId;
    
    const user = await User.findById(userId).select("-password");
    
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
      profilePhoto,
      driverLicensePhoto,
      selfieWithLicense,
      proofOfResidence,
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
    if (profilePhoto !== undefined) updateData.profilePhoto = profilePhoto;
    if (driverLicensePhoto !== undefined) updateData.driverLicensePhoto = driverLicensePhoto;
    if (selfieWithLicense !== undefined) updateData.selfieWithLicense = selfieWithLicense;
    if (proofOfResidence !== undefined) updateData.proofOfResidence = proofOfResidence;
    
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
    ).select("-password");
    
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
