import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCarById } from "../api/cars";
import { FALLBACK_CAR_IMAGE, resolveImageUrl } from "../utils/imageUrl.js";
import { useAppContext } from "../context/AppContext.jsx";
import { computeBasePriceForPeriod } from "../utils/rentalPricing.js";
import "./CarDetailsModal.css";

export default function CarDetailsModal({ carId, initialDates, onClose }) {
  const { formatPrice, language } = useAppContext();
  const navigate = useNavigate();
  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [step] = useState("details"); // booking is full page now
  const dialogRef = useRef(null);

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

  const pricingForPeriod = useMemo(() => {
    const startDate = initialDates?.startDate;
    const endDate = initialDates?.endDate;
    if (!startDate || !endDate) return null;
    return computeBasePriceForPeriod({
      startDate,
      endDate,
      priceWeekday: car?.priceWeekday,
      priceWeekend: car?.priceWeekend,
      fallbackPricePerDay: car?.pricePerDay,
    });
  }, [car?.pricePerDay, car?.priceWeekday, car?.priceWeekend, initialDates?.endDate, initialDates?.startDate]);

  const hasSelectedDates = Boolean(initialDates?.startDate && initialDates?.endDate);

  const includedKmForPeriod = useMemo(() => {
    if (!pricingForPeriod?.days) return null;
    return computeIncludedKm(pricingForPeriod.days);
  }, [pricingForPeriod?.days]);

  const galleryImages = useMemo(() => {
    const values = [];
    if (car?.imageUrl && typeof car.imageUrl === "string" && car.imageUrl.trim()) {
      values.push(car.imageUrl.trim());
    }
    if (Array.isArray(car?.imageUrls)) {
      car.imageUrls.forEach((url) => {
        if (typeof url === "string" && url.trim()) values.push(url.trim());
      });
    }
    const unique = Array.from(new Set(values));
    return unique.length ? unique : [FALLBACK_CAR_IMAGE];
  }, [car]);

  useEffect(() => {
    let isMounted = true;
    Promise.resolve().then(() => {
      if (!isMounted) return;
      setLoading(true);
      setError("");
      setCar(null);
      setActiveImageIndex(0);
    });

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

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="ik-modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="ik-modal" role="dialog" aria-modal="true" ref={dialogRef}>
        <div className="ik-modal-topbar">
          <div className="ik-modal-title">
            {car ? (
              <>
                <div className="ik-modal-title-main">
                  {car.brand} {car.model}
                </div>
                <div className="ik-modal-title-sub">
                  {initialDates?.startDate && initialDates?.endDate
                    ? `${new Date(initialDates.startDate).toLocaleDateString("fr-FR")} → ${new Date(
                        initialDates.endDate
                      ).toLocaleDateString("fr-FR")}`
                    : ""}
                </div>
              </>
            ) : (
              <div className="ik-modal-title-main">
                {language === "fr" ? "Fiche véhicule" : "Vehicle details"}
              </div>
            )}
          </div>

          <button
            type="button"
            className="ik-modal-close"
            onClick={() => onClose?.()}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        {loading && <div className="ik-modal-state">Chargement...</div>}
        {!loading && error && <div className="ik-modal-state ik-modal-error">{error}</div>}

        {!loading && !error && car && (
          <>
            {step === "details" ? (
              <div className="ik-modal-body">
                <div className="ik-modal-media">
                  <div className="ik-modal-image-frame">
                  <img
                    src={resolveImageUrl(galleryImages[activeImageIndex])}
                    alt={`${car.brand} ${car.model}`}
                    className="ik-modal-image"
                    onError={(event) => {
                      event.currentTarget.src = FALLBACK_CAR_IMAGE;
                    }}
                  />
                  <div className="ik-media-overlay" aria-hidden="true">
                    <div className="ik-media-overlay-top">
                      <div className="ik-media-title">{car.brand} {car.model}</div>
                      <div className="ik-media-subtitle">
                        {car.category} • {car.transmission}
                      </div>
                    </div>
                    <div className="ik-media-overlay-bottom">
                      <div className="ik-media-icons">
                        <span className="ik-icon-chip">👥 {car.seats ?? "—"} places</span>
                        <span className="ik-icon-chip">🧳 {car.luggage ?? "—"} bagages</span>
                        <span className="ik-icon-chip">⛽ {car.fuel}</span>
                        {includedKmForPeriod ? (
                          <span className="ik-icon-chip">✓ {includedKmForPeriod.toLocaleString("fr-FR")} km inclus</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  </div>
                  {galleryImages.length > 1 && (
                    <div className="ik-modal-thumbs" aria-label="Galerie">
                      {galleryImages.slice(0, 6).map((url, idx) => (
                        <button
                          key={`${url}-${idx}`}
                          type="button"
                          className={`ik-modal-thumb-btn ${
                            idx === activeImageIndex ? "active" : ""
                          }`}
                          onClick={() => setActiveImageIndex(idx)}
                          aria-label={`Photo ${idx + 1}`}
                        >
                          <img
                            src={resolveImageUrl(url)}
                            alt={`${car.brand} ${car.model} ${idx + 1}`}
                            className="ik-modal-thumb"
                            onError={(event) => {
                              event.currentTarget.src = FALLBACK_CAR_IMAGE;
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="ik-modal-info">
                  <div className="ik-modal-chips">
                    <span className="ik-chip">{car.category}</span>
                    <span className="ik-chip">{car.transmission}</span>
                    <span className="ik-chip">{car.fuel}</span>
                  </div>

                  <div className="ik-modal-specs">
                    <div className="ik-spec">👥 <strong>{car.seats ?? "—"}</strong> places</div>
                    <div className="ik-spec">🧳 <strong>{car.luggage ?? "—"}</strong> bagages</div>
                  </div>

                  <div className="ik-modal-block">
                    <div className="ik-modal-block-title">
                      {language === "fr" ? "Conditions" : "Requirements"}
                    </div>
                    <div className="ik-modal-list">
                      <div>🚗 Âge minimum : <strong>21 ans</strong></div>
                      <div>🪪 Permis : <strong>3 ans minimum</strong></div>
                      <div>
                        🧾 Forfait km inclus :{" "}
                        <strong>
                          {includedKmForPeriod
                            ? `${includedKmForPeriod.toLocaleString("fr-FR")} km`
                            : "—"}
                        </strong>{" "}
                        <span className="ik-muted">(selon vos dates)</span>
                      </div>
                    </div>
                  </div>

                  <details className="ik-accordion">
                    <summary>{language === "fr" ? "Caractéristiques & options" : "Features"}</summary>
                    <div className="ik-accordion-body">
                      <div className="ik-feature-grid">
                        <div>🎨 Couleur : <strong>Noir</strong></div>
                        <div>📱 Apple CarPlay : <strong>Oui</strong></div>
                        <div>🤖 Android Auto : <strong>Oui</strong></div>
                        <div>🧭 GPS intégré : <strong>Oui</strong></div>
                        <div>🔥 Sièges chauffants : <strong>Non</strong></div>
                        <div>📷 Caméra de recul : <strong>Oui</strong></div>
                        <div>❄️ Chaînes neige incluses : <strong>Non</strong></div>
                      </div>
                    </div>
                  </details>

                  <div className="ik-modal-price">
                    {pricingForPeriod ? (
                      <>
                        <div className="ik-price-total">{formatPrice(pricingForPeriod.total)}</div>
                        <div className="ik-price-sub">
                          {language === "fr"
                            ? `Semaine ${formatPrice(pricingForPeriod.weekdayRate)} /j · Week-end ${formatPrice(
                                pricingForPeriod.weekendRate
                              )} /j`
                            : `Weekday ${formatPrice(pricingForPeriod.weekdayRate)}/day · Weekend ${formatPrice(
                                pricingForPeriod.weekendRate
                              )}/day`}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="ik-price-total">{formatPrice(car.pricePerDay)}</div>
                        <div className="ik-price-sub">
                          {language === "fr"
                            ? `Semaine ${formatPrice(car.priceWeekday || car.pricePerDay)} /j · Week-end ${formatPrice(
                                car.priceWeekend || car.pricePerDay
                              )} /j`
                            : `Weekday ${formatPrice(car.priceWeekday || car.pricePerDay)}/day · Weekend ${formatPrice(
                                car.priceWeekend || car.pricePerDay
                              )}/day`}
                        </div>
                      </>
                    )}
                    <button
                      type="button"
                      className="ik-cta"
                      disabled={!hasSelectedDates}
                      onClick={() => {
                        if (!hasSelectedDates) return;
                        const params = new URLSearchParams();
                        params.set("car", String(carId));
                        if (initialDates?.startDate) params.set("startDate", initialDates.startDate);
                        if (initialDates?.startTime) params.set("startTime", initialDates.startTime);
                        if (initialDates?.endDate) params.set("endDate", initialDates.endDate);
                        if (initialDates?.endTime) params.set("endTime", initialDates.endTime);
                        if (initialDates?.station) params.set("station", initialDates.station);
                        onClose?.();
                        navigate(`/checkout?${params.toString()}`);
                      }}
                    >
                      {hasSelectedDates
                        ? language === "fr"
                          ? "Réserver"
                          : "Continue"
                        : language === "fr"
                          ? "Choisir des dates"
                          : "Choose dates"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

