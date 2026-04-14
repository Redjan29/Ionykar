import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getProfile, updateProfile, uploadMyDocument } from "../api/users";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer.jsx";
import { useToast } from "../hooks/useToast";
import Toast from "../components/Toast";
import "./Profile.css";

export default function Profile() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toasts, hideToast, success, error } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [kyc, setKyc] = useState({});
  const [formData, setFormData] = useState({
    phone: "",
    street: "",
    city: "",
    zipCode: "",
    country: "France",
    profilePhoto: "",
    driverLicensePhoto: "",
    selfieWithLicense: "",
    proofOfResidence: "",
    licenseObtainedDate: "",
    licenseExpiry: "",
    licenseNumber: "",
  });

  const [licenseWarning, setLicenseWarning] = useState("");
  const [fileNames, setFileNames] = useState({
    profilePhoto: "",
    driverLicensePhoto: "",
    selfieWithLicense: "",
    proofOfResidence: "",
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      loadProfile();
    }
  }, [isAuthenticated]);

  const hasPendingDocs = useMemo(() => {
    const docTypes = ["driverLicensePhoto", "proofOfResidence"];
    return docTypes.some((t) => String(kyc?.[t]?.status || "").toUpperCase() === "PENDING");
  }, [kyc]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    if (!hasPendingDocs) return undefined;
    const intervalId = setInterval(() => {
      loadProfile();
    }, 8000);
    return () => clearInterval(intervalId);
  }, [hasPendingDocs, isAuthenticated]);

  const loadProfile = async () => {
    try {
      const profile = await getProfile();
      setKyc(profile.kyc || {});
      setFormData({
        phone: profile.phone || "",
        street: profile.address?.street || "",
        city: profile.address?.city || "",
        zipCode: profile.address?.zipCode || "",
        country: profile.address?.country || "France",
        profilePhoto: profile.kyc?.profilePhoto?.url || profile.profilePhoto || "",
        driverLicensePhoto: profile.kyc?.driverLicensePhoto?.url || profile.driverLicensePhoto || "",
        selfieWithLicense: profile.kyc?.selfieWithLicense?.url || profile.selfieWithLicense || "",
        proofOfResidence: profile.kyc?.proofOfResidence?.url || profile.proofOfResidence || "",
        licenseObtainedDate: profile.licenseObtainedDate 
          ? new Date(profile.licenseObtainedDate).toISOString().split("T")[0] 
          : "",
        licenseExpiry: profile.licenseExpiry 
          ? new Date(profile.licenseExpiry).toISOString().split("T")[0] 
          : "",
        licenseNumber: profile.licenseNumber || "",
      });

      setFileNames({
        profilePhoto: (profile.kyc?.profilePhoto?.url || profile.profilePhoto) ? "Fichier déjà enregistré" : "",
        driverLicensePhoto: (profile.kyc?.driverLicensePhoto?.url || profile.driverLicensePhoto) ? "Fichier déjà enregistré" : "",
        selfieWithLicense: (profile.kyc?.selfieWithLicense?.url || profile.selfieWithLicense) ? "Fichier déjà enregistré" : "",
        proofOfResidence: (profile.kyc?.proofOfResidence?.url || profile.proofOfResidence) ? "Fichier déjà enregistré" : "",
      });
    } catch (err) {
      error("Erreur lors du chargement du profil");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Vérifier la date d'obtention du permis
    if (name === "licenseObtainedDate" && value) {
      const obtainedDate = new Date(value);
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      if (obtainedDate > oneYearAgo) {
        setLicenseWarning("⚠️ Attention : votre permis doit être obtenu depuis au moins 1 an");
      } else {
        setLicenseWarning("");
      }
    }
  };

  const handleFileChange = async (event, fieldName) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      error("Le fichier dépasse 5MB. Veuillez choisir un fichier plus léger.");
      return;
    }

    try {
      const updated = await uploadMyDocument(fieldName, file);
      const url = updated?.kyc?.[fieldName]?.url || "";
      setFormData((prev) => ({ ...prev, [fieldName]: url }));
      setKyc(updated?.kyc || {});
      setFileNames((prev) => ({ ...prev, [fieldName]: file.name }));
      success("Document envoyé. En attente de validation admin.");
    } catch {
      error("Impossible d'envoyer le document. Vérifiez la taille et réessayez.");
    }
  };

  const docMeta = (docType) => {
    const doc = kyc?.[docType] || {};
    const status = String(doc.status || (doc.url ? "PENDING" : "MISSING")).toUpperCase();
    const rejectedReason = doc.rejectedReason || "";
    return { status, rejectedReason };
  };

  const kycStatusLabel = (status) => {
    switch (status) {
      case "APPROVED":
        return "Validé";
      case "PENDING":
        return "En attente";
      case "REJECTED":
        return "Refusé";
      default:
        return "Manquant";
    }
  };

  const statusColor = (status) => {
    switch (status) {
      case "APPROVED":
        return "#047857";
      case "PENDING":
        return "#1d4ed8";
      case "REJECTED":
        return "#b91c1c";
      default:
        return "#6b7280";
    }
  };

  const getImagePreview = (value) => {
    if (!value) return "";
    if (value.startsWith("data:image/")) return value;
    if (value.startsWith("http://") || value.startsWith("https://")) return value;
    if (value.startsWith("/uploads/")) return `${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"}${value}`;
    return "";
  };

  const getFileUrl = (value) => {
    if (!value) return "";
    if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:")) return value;
    if (value.startsWith("/uploads/")) return `${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"}${value}`;
    return "";
  };

  const isPdfUrl = (value) => {
    const url = String(value || "").toLowerCase();
    return url.includes(".pdf") || url.startsWith("data:application/pdf");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await updateProfile({
        phone: formData.phone,
        address: {
          street: formData.street,
          city: formData.city,
          zipCode: formData.zipCode,
          country: formData.country,
        },
        licenseObtainedDate: formData.licenseObtainedDate || undefined,
        licenseExpiry: formData.licenseExpiry || undefined,
        licenseNumber: formData.licenseNumber,
      });

      success("Profil mis à jour avec succès !");
    } catch (err) {
      error(err.message || "Erreur lors de la mise à jour du profil");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <>
        <Navbar />
        <div className="profile-container">
          <p>Chargement...</p>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => hideToast(toast.id)}
        />
      ))}
      <div className="profile-container">
        <div className="profile-content">
          <h1>Mon Profil</h1>
          <p className="profile-subtitle">
            Gérez vos informations personnelles
          </p>
          <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
            <button
              type="button"
              className="btn-save"
              style={{ width: "auto", padding: "10px 14px", boxShadow: "none" }}
              onClick={loadProfile}
            >
              Rafraîchir le statut des documents
            </button>
          </div>

          <form onSubmit={handleSubmit} className="profile-form">
            {/* Photo de profil */}
            <section className="profile-section">
              <h2>Photo de profil</h2>
              <div className="form-group">
                <label htmlFor="profilePhoto">Importer une photo de profil</label>
                <div
                  style={{
                    marginBottom: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    color: statusColor(docMeta("profilePhoto").status),
                  }}
                >
                  Statut: {kycStatusLabel(docMeta("profilePhoto").status)}
                </div>
                {docMeta("profilePhoto").status === "APPROVED" ? null : (
                  <input
                    type="file"
                    id="profilePhoto"
                    name="profilePhoto"
                    accept="image/*"
                    onChange={(event) => handleFileChange(event, "profilePhoto")}
                  />
                )}
                {fileNames.profilePhoto && (
                  <small className="form-hint">Fichier: {fileNames.profilePhoto}</small>
                )}
                {getImagePreview(formData.profilePhoto) && (
                  <img
                    className="file-preview-image"
                    src={getImagePreview(formData.profilePhoto)}
                    alt="Aperçu photo de profil"
                  />
                )}
                {!getImagePreview(formData.profilePhoto) && getFileUrl(formData.profilePhoto) ? (
                  <a
                    href={getFileUrl(formData.profilePhoto)}
                    target="_blank"
                    rel="noreferrer"
                    className="profile-doc-link"
                  >
                    Voir le document
                  </a>
                ) : null}
                <small className="form-hint">
                  Sélectionnez une image depuis votre téléphone ou ordinateur (optionnel)
                </small>
              </div>
            </section>

            {/* Coordonnées */}
            <section className="profile-section">
              <h2>Coordonnées</h2>
              <div className="form-group">
                <label htmlFor="phone">Numéro de téléphone</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+33 6 12 34 56 78"
                />
              </div>

              <div className="form-group">
                <label htmlFor="street">Adresse</label>
                <input
                  type="text"
                  id="street"
                  name="street"
                  value={formData.street}
                  onChange={handleChange}
                  placeholder="12 rue de la République"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="zipCode">Code postal</label>
                  <input
                    type="text"
                    id="zipCode"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleChange}
                    placeholder="75001"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="city">Ville</label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="Paris"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="country">Pays</label>
                <input
                  type="text"
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  placeholder="France"
                />
              </div>
            </section>

            {/* Permis de conduire */}
            <section className="profile-section">
              <h2>Permis de conduire</h2>
              <div className="form-group">
                <label htmlFor="licenseNumber">Numéro de permis</label>
                <input
                  type="text"
                  id="licenseNumber"
                  name="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  placeholder="123456789"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="licenseObtainedDate">Date d'obtention</label>
                  <input
                    type="date"
                    id="licenseObtainedDate"
                    name="licenseObtainedDate"
                    value={formData.licenseObtainedDate}
                    onChange={handleChange}
                  />
                  {licenseWarning && (
                    <small className="form-warning">{licenseWarning}</small>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="licenseExpiry">Date d'expiration</label>
                  <input
                    type="date"
                    id="licenseExpiry"
                    name="licenseExpiry"
                    value={formData.licenseExpiry}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="driverLicensePhoto">
                  Photo du permis de conduire
                </label>
                <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 700, color: statusColor(docMeta("driverLicensePhoto").status) }}>
                  Statut: {kycStatusLabel(docMeta("driverLicensePhoto").status)}
                </div>
                {docMeta("driverLicensePhoto").status === "REJECTED" && docMeta("driverLicensePhoto").rejectedReason ? (
                  <div style={{ marginBottom: 10, color: "#b91c1c", fontWeight: 700 }}>
                    Raison: {docMeta("driverLicensePhoto").rejectedReason}
                  </div>
                ) : null}
                {docMeta("driverLicensePhoto").status === "APPROVED" ? null : (
                  <input
                    type="file"
                    id="driverLicensePhoto"
                    name="driverLicensePhoto"
                    accept="image/*"
                    onChange={(event) => handleFileChange(event, "driverLicensePhoto")}
                  />
                )}
                {fileNames.driverLicensePhoto && (
                  <small className="form-hint">Fichier: {fileNames.driverLicensePhoto}</small>
                )}
                {getImagePreview(formData.driverLicensePhoto) && (
                  <img
                    className="file-preview-image"
                    src={getImagePreview(formData.driverLicensePhoto)}
                    alt="Aperçu permis de conduire"
                  />
                )}
                {!getImagePreview(formData.driverLicensePhoto) && getFileUrl(formData.driverLicensePhoto) ? (
                  <a
                    href={getFileUrl(formData.driverLicensePhoto)}
                    target="_blank"
                    rel="noreferrer"
                    className="profile-doc-link"
                  >
                    Voir le document
                  </a>
                ) : null}
                <small className="form-hint">
                  Ajoutez une photo claire du permis (optionnel)
                </small>
              </div>
            </section>

            {/* Vérification d'identité */}
            <section className="profile-section">
              <h2>Vérification d'identité</h2>
              <div className="form-group">
                <label htmlFor="selfieWithLicense">
                  Selfie avec permis en main
                </label>
                <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 700, color: statusColor(docMeta("selfieWithLicense").status) }}>
                  Statut: {kycStatusLabel(docMeta("selfieWithLicense").status)}
                </div>
                {docMeta("selfieWithLicense").status === "REJECTED" && docMeta("selfieWithLicense").rejectedReason ? (
                  <div style={{ marginBottom: 10, color: "#b91c1c", fontWeight: 700 }}>
                    Raison: {docMeta("selfieWithLicense").rejectedReason}
                  </div>
                ) : null}
                {docMeta("selfieWithLicense").status === "APPROVED" ? null : (
                  <input
                    type="file"
                    id="selfieWithLicense"
                    name="selfieWithLicense"
                    accept="image/*"
                    capture="user"
                    onChange={(event) => handleFileChange(event, "selfieWithLicense")}
                  />
                )}
                {fileNames.selfieWithLicense && (
                  <small className="form-hint">Fichier: {fileNames.selfieWithLicense}</small>
                )}
                {getImagePreview(formData.selfieWithLicense) && (
                  <img
                    className="file-preview-image"
                    src={getImagePreview(formData.selfieWithLicense)}
                    alt="Aperçu selfie avec permis"
                  />
                )}
                {!getImagePreview(formData.selfieWithLicense) && getFileUrl(formData.selfieWithLicense) ? (
                  <a
                    href={getFileUrl(formData.selfieWithLicense)}
                    target="_blank"
                    rel="noreferrer"
                    className="profile-doc-link"
                  >
                    Voir le document
                  </a>
                ) : null}
                <small className="form-hint">
                  Prenez ou importez une photo de vous avec votre permis (optionnel)
                </small>
              </div>
            </section>

            {/* Documents */}
            <section className="profile-section">
              <h2>Justificatifs</h2>
              <div className="form-group">
                <label htmlFor="proofOfResidence">
                  Justificatif de domicile
                </label>
                <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 700, color: statusColor(docMeta("proofOfResidence").status) }}>
                  Statut: {kycStatusLabel(docMeta("proofOfResidence").status)}
                </div>
                {docMeta("proofOfResidence").status === "REJECTED" && docMeta("proofOfResidence").rejectedReason ? (
                  <div style={{ marginBottom: 10, color: "#b91c1c", fontWeight: 700 }}>
                    Raison: {docMeta("proofOfResidence").rejectedReason}
                  </div>
                ) : null}
                {docMeta("proofOfResidence").status === "APPROVED" ? null : (
                  <input
                    type="file"
                    id="proofOfResidence"
                    name="proofOfResidence"
                    accept="image/*,application/pdf"
                    onChange={(event) => handleFileChange(event, "proofOfResidence")}
                  />
                )}
                {fileNames.proofOfResidence && (
                  <small className="form-hint">Fichier: {fileNames.proofOfResidence}</small>
                )}
                {isPdfUrl(formData.proofOfResidence) ? (
                  getFileUrl(formData.proofOfResidence) ? (
                    <a
                      href={getFileUrl(formData.proofOfResidence)}
                      target="_blank"
                      rel="noreferrer"
                      className="profile-doc-link"
                    >
                      Voir le PDF
                    </a>
                  ) : null
                ) : (
                  getImagePreview(formData.proofOfResidence) && (
                    <img
                      className="file-preview-image"
                      src={getImagePreview(formData.proofOfResidence)}
                      alt="Aperçu justificatif de domicile"
                    />
                  )
                )}
                <small className="form-hint">
                  Ajoutez un document depuis votre appareil (optionnel)
                </small>
              </div>
            </section>

            <div className="profile-actions">
              <button
                type="submit"
                className="btn-save"
                disabled={saving}
              >
                {saving ? "Enregistrement..." : "Enregistrer les modifications"}
              </button>
            </div>

            <div className="profile-note">
              <p>
                ℹ️ Pour réserver, vos documents doivent être envoyés et validés
                manuellement par un administrateur (statut “Validé”).
              </p>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
}
