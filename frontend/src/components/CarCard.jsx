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
}) {
  const { formatPrice, language } = useAppContext();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  
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
      {/* Header prix + bouton */}
      <div className="car-card-header">
        <div className="car-card-price">
          <span className="car-card-price-label">{priceLabel}</span>
          <div>
            <span className="car-card-price-value">
              {formatPrice(pricePerDay)}
            </span>
            <span className="car-card-price-unit">{perDayLabel}</span>
          </div>
        </div>
        {isAvailable ? (
          <Link to={buildCarUrl()}>
            <button className="car-card-button">
              {language === "fr" ? "Réserver" : "Book"}
            </button>
          </Link>
        ) : (
          <button className="car-card-button" disabled>
            {language === "fr" ? "Indisponible" : "Unavailable"}
          </button>
        )}
      </div>

      {/* Badge indisponible */}
      {!isAvailable && (
        <div className="car-card-unavailable-badge">
          <div>{language === "fr" ? "Indisponible pour ces dates" : "Unavailable for these dates"}</div>
          {nextAvailableDate && (
            <div className="car-card-next-available">
              {language === "fr" 
                ? `Disponible à partir du ${new Date(nextAvailableDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
                : `Available from ${new Date(nextAvailableDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`
              }
            </div>
          )}
        </div>
      )}

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
      </div>

      {/* Infos voiture */}
      <div className="car-card-info">
        <h2 className="car-card-brand">{brand}</h2>
        <p className="car-card-model">{model}</p>
        <p className="car-card-category">{category}</p>
      </div>

      {/* Caractéristiques */}
      <div className="car-card-features">
        <div className="car-card-feature">
          <div className="car-card-feature-icon">👥</div>
          <span className="car-card-feature-label">
            {language === "fr" ? "Places" : "Seats"}
          </span>
          <span className="car-card-feature-value">{seats}</span>
        </div>
        <div className="car-card-feature">
          <div className="car-card-feature-icon">🧳</div>
          <span className="car-card-feature-label">
            {language === "fr" ? "Bagages" : "Luggage"}
          </span>
          <span className="car-card-feature-value">{luggage}</span>
        </div>
        <div className="car-card-feature">
          <div className="car-card-feature-icon">⚙️</div>
          <span className="car-card-feature-label">
            {language === "fr" ? "Boîte" : "Gearbox"}
          </span>
          <span className="car-card-feature-value">{transmission}</span>
        </div>
        <div className="car-card-feature">
          <div className="car-card-feature-icon">⛽</div>
          <span className="car-card-feature-label">
            {language === "fr" ? "Carburant" : "Fuel"}
          </span>
          <span className="car-card-feature-value">{fuel}</span>
        </div>
      </div>
    </div>
  );
}

export default CarCard;
