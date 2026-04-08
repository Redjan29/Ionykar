// src/components/CarCard.jsx
import { useEffect, useMemo, useState } from "react";
import "./CarCard.css";
import { Link } from "react-router-dom";
import { useAppContext } from "../context/AppContext.jsx";
import { FALLBACK_CAR_IMAGE, resolveImageUrl } from "../utils/imageUrl.js";

function CarCard({
  _id,
  id,
  slug,
  brand,
  model,
  category,
  pricePerDay,
  imageUrl,
  imageUrls = [],
  seats,
  luggage,
  transmission,
  fuel,
  isAvailable = true,
  nextAvailableDate,
  searchParams,
  hasSelectedDates = false,
  onChooseDates,
  onBook,
}) {
  const { formatPrice, language } = useAppContext();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [hovered, setHovered] = useState(false);

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
  
  // Prefer SEO-friendly slugs, fallback to MongoDB id.
  const carId = slug || _id || id;
  const galleryImages = useMemo(() => {
    const values = [];
    if (imageUrl && typeof imageUrl === "string" && imageUrl.trim()) {
      values.push(imageUrl.trim());
    }
    if (Array.isArray(imageUrls)) {
      imageUrls.forEach((url) => {
        if (typeof url === "string" && url.trim()) {
          values.push(url.trim());
        }
      });
    }
    return Array.from(new Set(values));
  }, [imageUrl, imageUrls]);
  
  // Construire l'URL avec les dates si elles sont fournies
  const buildCarUrl = () => {
    if (searchParams) {
      const params = new URLSearchParams(searchParams);
      return `/cars/${carId}?${params.toString()}`;
    }
    return `/cars/${carId}`;
  };

  const priceLabel =
    language === "fr" ? "À partir de *" : "Starting from *";
  const perDayLabel =
    language === "fr" ? " / jour" : " / day";

  const pricingForPeriod = useMemo(() => {
    const startDate = searchParams?.startDate;
    const endDate = searchParams?.endDate;
    if (!startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMs = end - start;
    if (!Number.isFinite(diffMs) || diffMs < 0) return null;
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
    if (!Number.isFinite(days) || days < 1) return null;
    const total = Number(pricePerDay || 0) * days;
    return { days, total };
  }, [pricePerDay, searchParams?.endDate, searchParams?.startDate]);

  const includedKmForPeriod = useMemo(() => {
    if (!pricingForPeriod?.days) return null;
    const km = computeIncludedKm(pricingForPeriod.days);
    if (!km) return null;
    return km;
  }, [pricingForPeriod?.days]);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [carId, galleryImages.length]);

  useEffect(() => {
    if (!hovered || galleryImages.length <= 1) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      setActiveImageIndex((previous) => (previous + 1) % galleryImages.length);
    }, 900);

    return () => clearInterval(intervalId);
  }, [hovered, galleryImages.length]);

  return (
    <div className={`car-card ${!isAvailable ? 'car-card-unavailable' : ''}`}>
      {/* Image voiture */}
      <div
        className="car-card-image-wrapper"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => {
          setHovered(false);
          setActiveImageIndex(0);
        }}
      >
        <img
          className="car-card-image"
          src={resolveImageUrl(galleryImages[activeImageIndex])}
          alt={`${brand} ${model}`}
          onError={(event) => {
            event.currentTarget.src = FALLBACK_CAR_IMAGE;
          }}
        />
        {galleryImages.length > 1 && (
          <span className="car-card-image-counter">
            {activeImageIndex + 1}/{galleryImages.length}
          </span>
        )}

        <div className="car-card-overlay">
          <div className="car-card-overlay-top">
            <div className="car-card-overlay-title">
              <div className="car-card-overlay-brand">{brand}</div>
              <div className="car-card-overlay-model">{model}</div>
              <div className="car-card-overlay-meta">
                <span className="car-card-chip">{category}</span>
                <span className="car-card-chip">{transmission}</span>
                <span className="car-card-chip">{fuel}</span>
              </div>
            </div>
            <div className="car-card-overlay-action">
              {isAvailable ? (
                typeof onBook === "function" ? (
                  <button
                    type="button"
                    className="car-card-button"
                    disabled={!hasSelectedDates}
                    onClick={() => {
                      if (!hasSelectedDates) {
                        onChooseDates?.();
                        return;
                      }
                      onBook({ carId, _id, id, slug });
                    }}
                  >
                    {hasSelectedDates
                      ? language === "fr"
                        ? "Réserver"
                        : "Book"
                      : language === "fr"
                        ? "Choisir des dates"
                        : "Choose dates"}
                  </button>
                ) : (
                  <Link to={buildCarUrl()}>
                    <button className="car-card-button">
                      {language === "fr" ? "Réserver" : "Book"}
                    </button>
                  </Link>
                )
              ) : (
                <button className="car-card-button" disabled>
                  {language === "fr" ? "Indisponible" : "Unavailable"}
                </button>
              )}

              {!isAvailable && (
                <div className="car-card-unavailable-text" role="status" aria-live="polite">
                  <div>
                    {language === "fr"
                      ? "Indisponible pour ces dates"
                      : "Unavailable for these dates"}
                  </div>
                  {nextAvailableDate && (
                    <div className="car-card-next-available">
                      {language === "fr"
                        ? `Disponible à partir du ${new Date(nextAvailableDate).toLocaleDateString(
                            "fr-FR",
                            { day: "numeric", month: "long" }
                          )}`
                        : `Available from ${new Date(nextAvailableDate).toLocaleDateString(
                            "en-US",
                            { month: "long", day: "numeric" }
                          )}`}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="car-card-overlay-bottom">
            <div className="car-card-km">
              {includedKmForPeriod ? (
                <>✓ {includedKmForPeriod.toLocaleString("fr-FR")} km inclus pour vos dates</>
              ) : (
                <>✓ Kilométrage inclus (selon la période)</>
              )}
            </div>
            <div className="car-card-pricing">
              {pricingForPeriod ? (
                <>
                  <div className="car-card-total">
                    {formatPrice(pricingForPeriod.total)}
                  </div>
                  <div className="car-card-perday">
                    ({formatPrice(pricePerDay)}
                    {perDayLabel})
                  </div>
                </>
              ) : (
                <>
                  <div className="car-card-total">{formatPrice(pricePerDay)}</div>
                  <div className="car-card-perday">{perDayLabel}</div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CarCard;
