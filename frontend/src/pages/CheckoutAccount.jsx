import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import { fetchCarById } from "../api/cars.js";
import { useAppContext } from "../context/AppContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { FALLBACK_CAR_IMAGE, resolveImageUrl } from "../utils/imageUrl.js";
import { computeBasePriceForPeriod } from "../utils/rentalPricing.js";
import "./CheckoutAccount.css";

export default function CheckoutAccount() {
  const { language, formatPrice } = useAppContext();
  const { isAuthenticated, register } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const carId = searchParams.get("car") || "";
  const initialDates = useMemo(() => {
    return {
      startDate: searchParams.get("startDate") || "",
      startTime: searchParams.get("startTime") || "",
      endDate: searchParams.get("endDate") || "",
      endTime: searchParams.get("endTime") || "",
      station: searchParams.get("station") || "",
    };
  }, [searchParams]);

  const hasDates = Boolean(initialDates.startDate && initialDates.endDate);

  const [car, setCar] = useState(null);
  const [loadingCar, setLoadingCar] = useState(Boolean(carId));

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [consents, setConsents] = useState({
    marketing: false,
    cgl: false,
    privacy: false,
  });

  useEffect(() => {
    let isMounted = true;
    if (!carId) return undefined;
    setLoadingCar(true);
    fetchCarById(carId)
      .then((data) => {
        if (!isMounted) return;
        setCar(data);
      })
      .catch(() => {
        // silent: summary is optional
      })
      .finally(() => {
        if (!isMounted) return;
        setLoadingCar(false);
      });
    return () => {
      isMounted = false;
    };
  }, [carId]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleConsent = (key) => {
    setConsents((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const hasRequiredConsents = Boolean(consents.cgl && consents.privacy);

  const periodPricing = useMemo(() => {
    if (!hasDates) return null;
    return computeBasePriceForPeriod({
      startDate: initialDates.startDate,
      endDate: initialDates.endDate,
      priceWeekday: car?.priceWeekday,
      priceWeekend: car?.priceWeekend,
      fallbackPricePerDay: car?.pricePerDay,
    });
  }, [car?.pricePerDay, car?.priceWeekday, car?.priceWeekend, hasDates, initialDates.endDate, initialDates.startDate]);

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

  const includedKmForPeriod = useMemo(() => {
    if (!periodPricing?.days) return null;
    return computeIncludedKm(periodPricing.days);
  }, [periodPricing?.days]);

  const carImage = useMemo(() => {
    const url = car?.imageUrl || (Array.isArray(car?.imageUrls) ? car.imageUrls[0] : "") || "";
    return resolveImageUrl(url) || FALLBACK_CAR_IMAGE;
  }, [car?.imageUrl, car?.imageUrls]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (formData.password.length < 8) {
      setError(language === "fr" ? "Le mot de passe doit contenir au moins 8 caractères" : "Password must be at least 8 characters");
      setLoading(false);
      return;
    }
    if (!/\d/.test(formData.password)) {
      setError(language === "fr" ? "Le mot de passe doit contenir au moins un chiffre" : "Password must contain at least one number");
      setLoading(false);
      return;
    }

    try {
      await register(formData);
      navigate(`/checkout?${searchParams.toString()}`);
    } catch (err) {
      setError(
        err?.message ||
          (language === "fr" ? "Erreur lors de la création du compte" : "Error creating account")
      );
    } finally {
      setLoading(false);
    }
  };

  if (!carId) return <Navigate to="/cars" replace />;
  if (!hasDates) return <Navigate to={`/cars?car=${encodeURIComponent(carId)}`} replace />;
  if (isAuthenticated) return <Navigate to={`/checkout?${searchParams.toString()}`} replace />;

  const datesLabel =
    initialDates.startDate && initialDates.endDate
      ? `${new Date(initialDates.startDate).toLocaleDateString("fr-FR")} → ${new Date(initialDates.endDate).toLocaleDateString("fr-FR")}`
      : "";

  return (
    <>
      <Navbar authDisabled />
      <div className="checkout-account-page">
        <div className="checkout-account-top">
          <Link className="checkout-account-back" to={`/checkout?${searchParams.toString()}`}>
            ← {language === "fr" ? "Retour" : "Back"}
          </Link>
          <div className="checkout-account-title">
            {language === "fr" ? "Créer un compte" : "Create an account"}
          </div>
          <div />
        </div>

        <div className="checkout-account-grid">
          <div className="checkout-account-left">
            <div className="checkout-account-card">
              <div className="checkout-account-card-top">
                <div className="checkout-account-subtitle">
                  {language === "fr"
                    ? "Il est nécessaire de créer un compte pour confirmer votre réservation."
                    : "You need an account to confirm your booking."}
                </div>
                <div className="checkout-account-inline">
                  <span className="checkout-account-inline-muted">
                    {language === "fr" ? "Déjà membre ?" : "Already a member?"}
                  </span>
                  <Link className="checkout-account-inline-link" to={`/login?next=${encodeURIComponent(`/checkout?${searchParams.toString()}`)}`}>
                    {language === "fr" ? "Se connecter" : "Log in"}
                  </Link>
                </div>
              </div>

              <button type="button" className="checkout-google" disabled aria-disabled="true">
                <span className="checkout-google-icon" aria-hidden="true">G</span>
                {language === "fr" ? "Continuer avec Google" : "Continue with Google"}
              </button>

              {error ? <div className="checkout-account-error">{error}</div> : null}

              <form className="checkout-account-form" onSubmit={handleSubmit}>
                <div className="checkout-account-row">
                  <label>
                    {language === "fr" ? "Prénom" : "First name"}
                    <input name="firstName" value={formData.firstName} onChange={handleChange} required disabled={loading} />
                  </label>
                  <label>
                    {language === "fr" ? "Nom" : "Last name"}
                    <input name="lastName" value={formData.lastName} onChange={handleChange} required disabled={loading} />
                  </label>
                </div>

                <label>
                  {language === "fr" ? "Numéro de téléphone" : "Phone"}
                  <input name="phone" value={formData.phone} onChange={handleChange} required disabled={loading} placeholder="+33 6 12 34 56 78" />
                </label>

                <label>
                  Email
                  <input type="email" name="email" value={formData.email} onChange={handleChange} required disabled={loading} />
                </label>

                <label>
                  {language === "fr" ? "Mot de passe" : "Password"}
                  <div className="checkout-account-password">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      minLength={8}
                      placeholder={language === "fr" ? "8+ caractères, 1 chiffre" : "8+ chars, 1 number"}
                    />
                    <button type="button" onClick={() => setShowPassword((p) => !p)} disabled={loading}>
                      {showPassword ? "🙈" : "👁"}
                    </button>
                  </div>
                </label>

                <div className="checkout-account-consents">
                  <label className="checkout-account-consent">
                    <input
                      type="checkbox"
                      checked={consents.marketing}
                      onChange={() => handleConsent("marketing")}
                      disabled={loading}
                    />
                    <span>
                      {language === "fr"
                        ? "J'accepte de recevoir des communications (optionnel)"
                        : "I agree to receive communications (optional)"}
                    </span>
                  </label>

                  <label className="checkout-account-consent">
                    <input
                      type="checkbox"
                      checked={consents.cgl}
                      onChange={() => handleConsent("cgl")}
                      disabled={loading}
                    />
                    <span>
                      {language === "fr" ? "J'ai lu et j'accepte les " : "I have read and accept the "}
                      <Link to="/cgl" target="_blank" rel="noreferrer" className="checkout-account-consent-link">
                        {language === "fr" ? "Conditions générales" : "Terms"}
                      </Link>
                    </span>
                    <span className="checkout-account-consent-required">
                      {language === "fr" ? "(obligatoire)" : "(required)"}
                    </span>
                  </label>

                  <label className="checkout-account-consent">
                    <input
                      type="checkbox"
                      checked={consents.privacy}
                      onChange={() => handleConsent("privacy")}
                      disabled={loading}
                    />
                    <span>
                      {language === "fr" ? "J'ai lu et j'accepte la " : "I have read and accept the "}
                      <Link
                        to="/politique-confidentialite"
                        target="_blank"
                        rel="noreferrer"
                        className="checkout-account-consent-link"
                      >
                        {language === "fr" ? "politique de confidentialité" : "privacy policy"}
                      </Link>
                    </span>
                    <span className="checkout-account-consent-required">
                      {language === "fr" ? "(obligatoire)" : "(required)"}
                    </span>
                  </label>
                </div>

                <button type="submit" className="checkout-account-submit" disabled={loading || !hasRequiredConsents}>
                  {loading ? (language === "fr" ? "Création..." : "Creating...") : (language === "fr" ? "Créer mon compte" : "Create account")}
                </button>
              </form>
            </div>
          </div>

          <aside className="checkout-account-right">
            <div className="checkout-account-summary">
              <div className="checkout-account-summary-title">
                {language === "fr" ? "Aperçu de votre réservation" : "Booking preview"}
              </div>

              <div className="checkout-account-summary-hero">
                <div className="checkout-account-summary-hero-left">
                  <div className="checkout-account-summary-hero-label">{language === "fr" ? "Ma voiture" : "Car"}</div>
                  <div className="checkout-account-summary-hero-title">
                    {loadingCar ? "…" : car ? `${car.brand} ${car.model}` : "—"}
                  </div>
                  <div className="checkout-account-summary-hero-sub">
                    {car?.category ? `${car.category} — ${language === "fr" ? "ou similaire" : "or similar"}` : ""}
                  </div>
                </div>
                <div className="checkout-account-summary-hero-media" aria-hidden="true">
                  <img
                    src={carImage}
                    alt=""
                    onError={(e) => {
                      e.currentTarget.src = FALLBACK_CAR_IMAGE;
                    }}
                  />
                </div>
              </div>

              <div className="checkout-account-summary-block">
                <div className="checkout-account-summary-label">{language === "fr" ? "Ma station" : "Station"}</div>
                <div className="checkout-account-summary-value">
                  {initialDates.station ? initialDates.station : language === "fr" ? "Paris 12e — Bastille" : "Paris 12th — Bastille"}
                </div>
              </div>

              <div className="checkout-account-summary-block">
                <div className="checkout-account-summary-label">{language === "fr" ? "Mes dates" : "Dates"}</div>
                <div className="checkout-account-summary-value">{datesLabel}</div>
              </div>

              <div className="checkout-account-summary-block">
                <div className="checkout-account-summary-label">{language === "fr" ? "Prix" : "Price"}</div>
                <div className="checkout-account-summary-value">
                  {periodPricing ? (
                    <>
                      {formatPrice(periodPricing.total)}{" "}
                      <span className="checkout-account-summary-muted">
                        ({periodPricing.days} {language === "fr" ? "jours" : "days"})
                      </span>
                    </>
                  ) : (
                    "—"
                  )}
                </div>
              </div>

              <div className="checkout-account-summary-block">
                <div className="checkout-account-summary-label">{language === "fr" ? "Kilométrage inclus" : "Included mileage"}</div>
                <div className="checkout-account-summary-value">
                  {includedKmForPeriod ? (
                    <>
                      {includedKmForPeriod.toLocaleString("fr-FR")} km{" "}
                      <span className="checkout-account-summary-muted">{language === "fr" ? "inclus" : "included"}</span>
                    </>
                  ) : (
                    "—"
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
      <Footer />
    </>
  );
}

