import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import { fetchCarById } from "../api/cars.js";
import { createReservation } from "../api/reservations.js";
import { useAppContext } from "../context/AppContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import "./Checkout.css";

export default function Checkout() {
  const { formatPrice, language } = useAppContext();
  const { isAuthenticated, user } = useAuth();
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
  const [loading, setLoading] = useState(Boolean(carId));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [options, setOptions] = useState({
    unlimitedKm: false, // 50€/jour
    snowChains: false, // 15€/jour
    fullFuelPrepay: false, // 99€
    deliveryParis: false, // 50€
  });

  useEffect(() => {
    let isMounted = true;
    if (!carId) return undefined;
    setLoading(true);
    setError("");
    fetchCarById(carId)
      .then((data) => {
        if (!isMounted) return;
        setCar(data);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err?.message || "Erreur lors du chargement.");
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [carId]);

  const periodPricing = useMemo(() => {
    if (!car?.pricePerDay || !hasDates) return null;
    const start = new Date(initialDates.startDate);
    const end = new Date(initialDates.endDate);
    const diffMs = end - start;
    if (!Number.isFinite(diffMs) || diffMs < 0) return null;
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
    if (!Number.isFinite(days) || days < 1) return null;
    return { days, total: days * Number(car.pricePerDay || 0) };
  }, [car?.pricePerDay, hasDates, initialDates.endDate, initialDates.startDate]);

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

  const pricing = useMemo(() => {
    const days = periodPricing?.days || 0;
    const base = periodPricing?.total || 0;

    const unlimitedKmPerDay = 50;
    const snowChainsPerDay = 15;
    const fullFuelFlat = 99;
    const deliveryFlat = 50;

    const unlimitedKm = options.unlimitedKm ? unlimitedKmPerDay * days : 0;
    const snowChains = options.snowChains ? snowChainsPerDay * days : 0;
    const fullFuel = options.fullFuelPrepay ? fullFuelFlat : 0;
    const delivery = options.deliveryParis ? deliveryFlat : 0;

    const optionsTotal = unlimitedKm + snowChains + fullFuel + delivery;
    const total = base + optionsTotal;

    return {
      days,
      base,
      optionsTotal,
      total,
    };
  }, [options, periodPricing?.days, periodPricing?.total]);

  const handleToggle = (key) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const buildNotes = () => {
    const lines = [];
    if (includedKmForPeriod) {
      lines.push(`Forfait km inclus (période): ${includedKmForPeriod} km`);
    }
    if (options.unlimitedKm) lines.push("Option: Kilométrage illimité (50€/jour)");
    if (options.snowChains) lines.push("Option: Chaînes neige (15€/jour)");
    if (options.fullFuelPrepay) lines.push("Option: Pré-paiement plein carburant (99€)");
    if (options.deliveryParis) lines.push("Option: Livraison à Paris (50€)");
    return lines.join(" | ") || undefined;
  };

  const handleContinue = async () => {
    if (!isAuthenticated) {
      navigate(`/checkout/account?${searchParams.toString()}`);
      return;
    }
    if (!car || !periodPricing) return;
    setSubmitting(true);
    try {
      await createReservation({
        carId: car._id || car.id,
        startDate: initialDates.startDate,
        endDate: initialDates.endDate,
        startTime: initialDates.startTime,
        endTime: initialDates.endTime,
        user: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          licenseNumber: user.licenseNumber,
          licenseExpiry: user.licenseExpiry,
        },
        notes: buildNotes(),
      });
      navigate("/my-reservations");
    } catch (err) {
      setError(err?.message || "Erreur lors de l'envoi de la demande.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!carId) {
    return <Navigate to="/cars" replace />;
  }

  if (!hasDates) {
    // Checkout makes sense only when dates are selected
    return <Navigate to={`/cars?car=${encodeURIComponent(carId)}`} replace />;
  }

  return (
    <>
      <Navbar authDisabled={!isAuthenticated} />
      <div className="checkout-page">
        <div className="checkout-top">
          <Link className="checkout-back" to={`/cars?${searchParams.toString()}`}>
            ← {language === "fr" ? "Retour aux véhicules" : "Back to vehicles"}
          </Link>
          <div className="checkout-title">
            {language === "fr" ? "De quelles options avez-vous besoin ?" : "Which options do you need?"}
          </div>
          <div className="checkout-total">
            <div className="checkout-total-label">{language === "fr" ? "Total" : "Total"}</div>
            <div className="checkout-total-value">
              {periodPricing ? formatPrice(pricing.total) : "—"}
            </div>
            <button
              type="button"
              className="checkout-continue"
              onClick={handleContinue}
              disabled={!periodPricing || submitting}
            >
              {submitting ? (language === "fr" ? "Envoi..." : "Sending...") : (language === "fr" ? "Continuer" : "Continue")}
            </button>
          </div>
        </div>

        <div className="checkout-grid">
          <div className="checkout-left">
            {loading && <div className="checkout-state">Chargement...</div>}
            {!loading && error && <div className="checkout-state checkout-error">{error}</div>}

            {!loading && !error && car && (
              <div className="checkout-options">
                <div className="checkout-note">
                  ℹ️ {language === "fr"
                    ? "Les conducteurs doivent avoir le permis depuis au moins 3 ans pour ce véhicule."
                    : "Drivers must have held a license for at least 3 years for this vehicle."}
                </div>

                <div className="checkout-option-card">
                  <div className="checkout-option-main">
                    <div className="checkout-option-title">Kilométrage illimité</div>
                    <div className="checkout-option-price">50€ / jour</div>
                  </div>
                  <div className="checkout-option-actions">
                    <button type="button" className="checkout-details-btn">Détails</button>
                    <label className="checkout-switch">
                      <input
                        type="checkbox"
                        checked={options.unlimitedKm}
                        onChange={() => handleToggle("unlimitedKm")}
                      />
                      <span className="checkout-slider" />
                    </label>
                  </div>
                </div>

                <div className="checkout-option-card">
                  <div className="checkout-option-main">
                    <div className="checkout-option-title">Chaînes neige</div>
                    <div className="checkout-option-price">15€ / jour</div>
                  </div>
                  <div className="checkout-option-actions">
                    <button type="button" className="checkout-details-btn">Détails</button>
                    <label className="checkout-switch">
                      <input
                        type="checkbox"
                        checked={options.snowChains}
                        onChange={() => handleToggle("snowChains")}
                      />
                      <span className="checkout-slider" />
                    </label>
                  </div>
                </div>

                <div className="checkout-option-card">
                  <div className="checkout-option-main">
                    <div className="checkout-option-title">Pré-paiement plein de carburant</div>
                    <div className="checkout-option-price">99€ / une fois</div>
                  </div>
                  <div className="checkout-option-actions">
                    <button type="button" className="checkout-details-btn">Détails</button>
                    <label className="checkout-switch">
                      <input
                        type="checkbox"
                        checked={options.fullFuelPrepay}
                        onChange={() => handleToggle("fullFuelPrepay")}
                      />
                      <span className="checkout-slider" />
                    </label>
                  </div>
                </div>

                <div className="checkout-option-card">
                  <div className="checkout-option-main">
                    <div className="checkout-option-title">Livraison à Paris (préavis 24h)</div>
                    <div className="checkout-option-price">50€ / une fois</div>
                  </div>
                  <div className="checkout-option-actions">
                    <button type="button" className="checkout-details-btn">Détails</button>
                    <label className="checkout-switch">
                      <input
                        type="checkbox"
                        checked={options.deliveryParis}
                        onChange={() => handleToggle("deliveryParis")}
                      />
                      <span className="checkout-slider" />
                    </label>
                  </div>
                </div>

                {/* Removed: Extra km option (users can't predict extra mileage) */}
              </div>
            )}
          </div>

          <aside className="checkout-right">
            <div className="checkout-summary">
              <div className="checkout-summary-title">
                {language === "fr" ? "Aperçu de votre réservation" : "Booking preview"}
              </div>

              <div className="checkout-preview-list">
                <div className="checkout-preview-item">✓ Assurance au tiers</div>
                <div className="checkout-preview-item">✓ Assistance dépannage 24/7</div>
                <div className="checkout-preview-item">
                  ✓{" "}
                  {includedKmForPeriod
                    ? `${includedKmForPeriod.toLocaleString("fr-FR")} km sont inclus`
                    : "Kilométrage inclus"}{" "}
                </div>
                <div className="checkout-preview-item">
                  ✓ Option de paiement : <strong>Restez flexible</strong> — Annulation et modification gratuites
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

