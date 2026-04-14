import { useMemo, useState } from "react";
import { createReservation } from "../api/reservations";
import { activateAccount } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../hooks/useToast";
import Toast from "./Toast";
import "./BookingForm.css";

export default function BookingForm({ car, onClose, initialDates, mode = "modal" }) {
  const { login: authLogin, isAuthenticated, user } = useAuth();
  const { toasts, hideToast, success, error, warning } = useToast();
  const formatEUR = (value) =>
    Number.isFinite(value)
      ? new Intl.NumberFormat("fr-FR", {
          style: "currency",
          currency: "EUR",
          maximumFractionDigits: 0,
        }).format(value)
      : "—";
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    licenseNumber: "",
    licenseExpiry: "",
    startDate: initialDates?.startDate || "",
    endDate: initialDates?.endDate || "",
    startTime: initialDates?.startTime || "",
    endTime: initialDates?.endTime || "",
  });

  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountPassword, setAccountPassword] = useState("");
  const [accountError, setAccountError] = useState("");
  const [reservationSuccess, setReservationSuccess] = useState(null);
  const [extras, setExtras] = useState({
    unlimitedKm: false,
    snowChains: false,
    fullFuelOption: false,
    delivery: false,
  });

  const computeIncludedKm = (days) => {
    const d = Math.max(0, Number(days || 0));
    if (!Number.isFinite(d) || d <= 0) return null;
    const weeks = Math.ceil(d / 7);
    const months = Math.ceil(d / 30);
    const perDay = 150 * d;
    const perWeek = 800 * weeks;
    const perMonth = 3000 * months;
    return Math.min(perDay, perWeek, perMonth);
  };


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleExtrasChange = (e) => {
    const { name, type, checked, value } = e.target;
    setExtras((prev) => {
      if (type === "checkbox") return { ...prev, [name]: checked };
      return { ...prev, [name]: value };
    });
  };

  // calcul nombre de jours + prix estimé
  let days = null;
  let basePrice = null;
  let dateError = null;
  let licenseError = null;

  if (formData.startDate && formData.endDate) {
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const diffMs = end - start;

    if (diffMs < 0) {
      dateError = "La date de fin doit être après la date de début.";
    } else {
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1; // min 1 jour
      days = diffDays;
      basePrice = diffDays * car.pricePerDay;
    }

    // Vérification date d'expiration du permis (pour non connectés)
    if (!isAuthenticated && formData.licenseExpiry && formData.endDate) {
      const licenseExpiryDate = new Date(formData.licenseExpiry);
      const rentalEndDate = new Date(formData.endDate);
      
      if (licenseExpiryDate < rentalEndDate) {
        licenseError = "Votre permis expire avant la fin de la location. Veuillez le renouveler.";
      }
    }

    // Vérification pour utilisateur connecté
    if (isAuthenticated && user?.licenseExpiry && formData.endDate) {
      const licenseExpiryDate = new Date(user.licenseExpiry);
      const rentalEndDate = new Date(formData.endDate);
      
      if (licenseExpiryDate < rentalEndDate) {
        licenseError = "Votre permis expire avant la fin de la location. Veuillez mettre à jour votre profil.";
      }
    }
  }

  const pricing = useMemo(() => {
    const numberOfDays = days || 0;
    const base = basePrice || 0;

    // CDC options pricing
    const unlimitedKmPerDay = 50; // €/jour
    const snowChainsPerDay = 15; // €/jour
    const fullFuelFlat = 99; // €
    const deliveryFlat = 50; // €

    const unlimitedKm = extras.unlimitedKm ? unlimitedKmPerDay * numberOfDays : 0;
    const snowChains = extras.snowChains ? snowChainsPerDay * numberOfDays : 0;
    const fullFuel = extras.fullFuelOption ? fullFuelFlat : 0;
    const delivery = extras.delivery ? deliveryFlat : 0;

    const extrasTotal = unlimitedKm + snowChains + fullFuel + delivery;
    const total = base + extrasTotal;

    return {
      base,
      extrasTotal,
      total,
      breakdown: {
        unlimitedKm,
        snowChains,
        fullFuel,
        delivery,
      },
    };
  }, [basePrice, days, extras]);

  const includedKmForPeriod = useMemo(() => {
    if (!days) return null;
    return computeIncludedKm(days);
  }, [days]);

  const buildNotes = () => {
    const lines = [];
    if (includedKmForPeriod) {
      lines.push(`Forfait km inclus (période): ${includedKmForPeriod} km`);
    } else {
      lines.push("Forfait km inclus (période): à calculer");
    }
    if (extras.unlimitedKm) lines.push("Option: Kilométrage illimité");
    if (extras.snowChains) lines.push("Option: Chaînes neige");
    if (extras.fullFuelOption) lines.push("Option: Plein carburant (pré-paiement)");
    if (extras.delivery) lines.push("Option: Livraison à Paris (préavis 24h)");
    return lines.join(" | ");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (dateError) {
      error(dateError);
      return;
    }

    if (licenseError) {
      warning(licenseError);
      return;
    }

    if (!days) {
      warning("Veuillez choisir des dates valides.");
      return;
    }

    // Validation du numéro de permis pour non connectés (optionnelle en phase test)
    if (!isAuthenticated && formData.licenseNumber) {
      const licenseNum = formData.licenseNumber.trim();
      if (licenseNum.length < 6 || licenseNum.length > 20) {
        warning("Le numéro de permis doit contenir entre 6 et 20 caractères.");
        return;
      }
    }

    try {
      // Si connecté, utiliser les infos du user, sinon formData
      const userData = isAuthenticated ? {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        licenseNumber: user.licenseNumber,
        licenseExpiry: user.licenseExpiry,
      } : {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        licenseNumber: formData.licenseNumber,
        licenseExpiry: formData.licenseExpiry,
      };

      await createReservation({
        carId: car._id || car.id,
        startDate: formData.startDate,
        endDate: formData.endDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        user: userData,
        notes: buildNotes(),
      });

      // Si déjà connecté, confirmation simple et fermeture
      if (isAuthenticated) {
        success("Votre demande de location a bien été envoyée. Nous allons la vérifier et revenir vers vous rapidement.", 6000);
        setTimeout(() => onClose(), 6000);
      } else {
        // Si non connecté, afficher la modale de création de compte
        setReservationSuccess({ days, totalPrice: pricing.total, email: formData.email });
        setShowAccountModal(true);
      }
    } catch (err) {
      error(err.message || "Erreur lors de la réservation.");
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setAccountError("");

    if (accountPassword.length < 8) {
      setAccountError("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }

    if (!/\d/.test(accountPassword)) {
      setAccountError("Le mot de passe doit contenir au moins un chiffre");
      return;
    }

    try {
      await activateAccount(reservationSuccess.email, accountPassword);
      await authLogin(reservationSuccess.email, accountPassword);
      success("Compte créé avec succès ! Votre demande de location a bien été envoyée. Nous allons la vérifier et revenir vers vous rapidement.", 6000);
      setTimeout(() => onClose(), 6000);
    } catch (err) {
      setAccountError(err.message || "Erreur lors de la création du compte.");
    }
  };

  const handleSkipAccount = () => {
    success("Votre demande de location a bien été envoyée. Nous allons la vérifier et revenir vers vous rapidement.", 6000);
    setTimeout(() => onClose(), 6000);
  };

  return (
    <>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => hideToast(toast.id)}
        />
      ))}
      <div className="booking-form-container">
      {!showAccountModal ? (
        <>
          <h3>
            Demande de réservation pour {car.brand} {car.model}
          </h3>

          {isAuthenticated && (
            <p className="booking-user-info">
              Réservation pour : <strong>{user.firstName} {user.lastName}</strong> ({user.email})
            </p>
          )}

          <form className="booking-form" onSubmit={handleSubmit}>
            <div className="booking-form-grid">
              {/* Afficher les champs d'identité seulement si NON connecté */}
              {!isAuthenticated && (
                <>
                  <div className="booking-form-group">
                    <label>Prénom</label>
                    <input
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="booking-form-group">
                    <label>Nom</label>
                    <input
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="booking-form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="booking-form-group">
                    <label>Téléphone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="booking-form-group">
                    <label>Numéro de permis</label>
                    <input
                      name="licenseNumber"
                      value={formData.licenseNumber}
                      onChange={handleChange}
                      placeholder="Optionnel (6 à 20 caractères)"
                      minLength={6}
                      maxLength={20}
                    />
                  </div>

                  <div className="booking-form-group">
                    <label>Expiration permis</label>
                    <input
                      type="date"
                      name="licenseExpiry"
                      value={formData.licenseExpiry}
                      onChange={handleChange}
                    />
                  </div>
                </>
              )}

              {mode !== "checkout" && (
                <>
                  <div className="booking-form-group">
                    <label>Date de début</label>
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="booking-form-group">
                    <label>Heure de début</label>
                    <select
                      name="startTime"
                      value={formData.startTime}
                      onChange={handleChange}
                    >
                      <option value="">-- Choisir --</option>
                      <option value="09:00">09:00</option>
                      <option value="09:30">09:30</option>
                      <option value="10:00">10:00</option>
                      <option value="10:30">10:30</option>
                      <option value="11:00">11:00</option>
                      <option value="11:30">11:30</option>
                      <option value="12:00">12:00</option>
                      <option value="12:30">12:30</option>
                      <option value="13:00">13:00</option>
                      <option value="13:30">13:30</option>
                      <option value="14:00">14:00</option>
                      <option value="14:30">14:30</option>
                      <option value="15:00">15:00</option>
                      <option value="15:30">15:30</option>
                      <option value="16:00">16:00</option>
                      <option value="16:30">16:30</option>
                      <option value="17:00">17:00</option>
                      <option value="17:30">17:30</option>
                      <option value="18:00">18:00</option>
                      <option value="18:30">18:30</option>
                    </select>
                  </div>

                  <div className="booking-form-group">
                    <label>Date de fin</label>
                    <input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="booking-form-group">
                    <label>Heure de fin</label>
                    <select
                      name="endTime"
                      value={formData.endTime}
                      onChange={handleChange}
                    >
                      <option value="">-- Choisir --</option>
                      <option value="09:00">09:00</option>
                      <option value="09:30">09:30</option>
                      <option value="10:00">10:00</option>
                      <option value="10:30">10:30</option>
                      <option value="11:00">11:00</option>
                      <option value="11:30">11:30</option>
                      <option value="12:00">12:00</option>
                      <option value="12:30">12:30</option>
                      <option value="13:00">13:00</option>
                      <option value="13:30">13:30</option>
                      <option value="14:00">14:00</option>
                      <option value="14:30">14:30</option>
                      <option value="15:00">15:00</option>
                      <option value="15:30">15:30</option>
                      <option value="16:00">16:00</option>
                      <option value="16:30">16:30</option>
                      <option value="17:00">17:00</option>
                      <option value="17:30">17:30</option>
                      <option value="18:00">18:00</option>
                      <option value="18:30">18:30</option>
                    </select>
                  </div>
                </>
              )}
            </div>

        {dateError && <p className="booking-error">{dateError}</p>}
        {licenseError && <p className="booking-error">{licenseError}</p>}

        {days && !dateError && !licenseError && (
          <>
            <div className="booking-extras">
              <div className="booking-extras-title">Options</div>
              <div className="booking-included-km">
                Forfait kilométrique inclus :{" "}
                <strong>
                  {includedKmForPeriod
                    ? `${includedKmForPeriod.toLocaleString("fr-FR")} km`
                    : "—"}
                </strong>{" "}
                <span className="booking-included-km-sub">(calculé selon vos dates)</span>
              </div>
              <div className="booking-extras-grid">
                <label className="booking-extra">
                  <input
                    type="checkbox"
                    name="unlimitedKm"
                    checked={extras.unlimitedKm}
                    onChange={handleExtrasChange}
                  />
                  <span>Kilométrage illimité</span>
                  <span className="booking-extra-price">+50€ / jour</span>
                </label>

                <label className="booking-extra">
                  <input
                    type="checkbox"
                    name="snowChains"
                    checked={extras.snowChains}
                    onChange={handleExtrasChange}
                  />
                  <span>Chaînes neige</span>
                  <span className="booking-extra-price">+15€ / jour</span>
                </label>

                <label className="booking-extra">
                  <input
                    type="checkbox"
                    name="fullFuelOption"
                    checked={extras.fullFuelOption}
                    onChange={handleExtrasChange}
                  />
                  <span>Pré-paiement plein de carburant</span>
                  <span className="booking-extra-price">+99€</span>
                </label>

                <label className="booking-extra">
                  <input
                    type="checkbox"
                    name="delivery"
                    checked={extras.delivery}
                    onChange={handleExtrasChange}
                  />
                  <span>Livraison à Paris (préavis 24h)</span>
                  <span className="booking-extra-price">+50€</span>
                </label>
              </div>
            </div>

            <div className="booking-summary">
              <p>
                Durée : <strong>{days}</strong> jour(s)
              </p>
              <p>
                Sous-total : <strong>{formatEUR(pricing.base)}</strong>
              </p>
              <p>
                Options : <strong>{formatEUR(pricing.extrasTotal)}</strong>
              </p>
              <p className="booking-total">
                Total estimé : <strong>{formatEUR(pricing.total)}</strong>
              </p>
            </div>
          </>
        )}

        <div className="booking-form-actions">
          <button type="submit" className="booking-submit">
            Envoyer la demande
          </button>
          <button
            type="button"
            className="booking-cancel"
            onClick={onClose}
          >
            Annuler
          </button>
        </div>
      </form>
        </>
      ) : (
        <div className="account-modal">
          <h3>✅ Réservation envoyée !</h3>
          <p>
            Votre demande pour {reservationSuccess.days} jour(s) a été envoyée
            (prix estimé : {reservationSuccess.totalPrice}€).
          </p>
          <p className="modal-question">
            Créer un compte pour suivre votre réservation ?
          </p>

          <form onSubmit={handleCreateAccount} className="account-form">
            <div className="booking-form-group">
                <label>Mot de passe (min. 8 caractères + 1 chiffre)</label>
              <input
                type="password"
                value={accountPassword}
                onChange={(e) => setAccountPassword(e.target.value)}
                placeholder="Choisissez un mot de passe"
                autoFocus
              />
            </div>

            {accountError && <p className="booking-error">{accountError}</p>}

            <div className="booking-form-actions">
              <button type="submit" className="booking-submit">
                Créer mon compte
              </button>
              <button
                type="button"
                className="booking-cancel"
                onClick={handleSkipAccount}
              >
                Continuer sans compte
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
    </>
  );
}
