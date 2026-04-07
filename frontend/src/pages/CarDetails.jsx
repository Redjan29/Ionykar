// src/pages/CarDetails.jsx
import { useState, useRef, useEffect } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { fetchCarById } from "../api/cars";
import BookingForm from "../components/BookingForm";
import Navbar from "../components/Navbar";
import { useAppContext } from "../context/AppContext.jsx";
import { FALLBACK_CAR_IMAGE, resolveImageUrl } from "../utils/imageUrl.js";
import "./CarDetails.css";

export default function CarDetails() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { formatPrice, language } = useAppContext();

  const [showForm, setShowForm] = useState(false);
  const formRef = useRef(null);
  
  // Récupérer les dates des query params
  const datesFromUrl = {
    startDate: searchParams.get("startDate") || "",
    startTime: searchParams.get("startTime") || "",
    endDate: searchParams.get("endDate") || "",
    endTime: searchParams.get("endTime") || "",
  };

  useEffect(() => {
    let isMounted = true;

    fetchCarById(id)
      .then((data) => {
        if (isMounted) {
          setCar(data);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Erreur lors du chargement.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (showForm && formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showForm]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div style={{ padding: 20 }}>
          <p>Chargement...</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div style={{ padding: 20 }}>
          <p style={{ color: "#b91c1c" }}>{error}</p>
        </div>
      </>
    );
  }

  if (!car) {
    return (
      <>
        <Navbar />
        <div style={{ padding: 20 }}>
          <h2>
            {language === "fr" ? "Voiture introuvable." : "Car not found."}
          </h2>
          <Link to="/">
            {language === "fr"
              ? "← Retour aux véhicules"
              : "← Back to vehicles"}
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="car-details-page">
        <div className="car-details-container">
          {/* LEFT */}
          <div className="car-details-left">
            <img
              src={resolveImageUrl(car.imageUrl)}
              alt={car.brand}
              className="car-details-main-image"
              onError={(event) => {
                event.currentTarget.src = FALLBACK_CAR_IMAGE;
              }}
            />

            <div className="car-details-thumbs">
              <img
                src={resolveImageUrl(car.imageUrl)}
                alt="thumb"
                className="car-details-thumb active"
                onError={(event) => {
                  event.currentTarget.src = FALLBACK_CAR_IMAGE;
                }}
              />
            </div>
          </div>

          {/* RIGHT */}
          <div className="car-details-right">
            <span className="car-details-category">{car.category}</span>

            <h1 className="car-details-title">
              {car.brand} {car.model}
            </h1>

            <p className="car-details-subtitle">
              {language === "fr" ? "Ou similaire" : "Or similar"}
            </p>

            <p className="car-details-description">{car.description}</p>

            <div className="car-details-specs">
              <div className="car-spec-box">
                👥 {car.seats}{" "}
                {language === "fr" ? "places" : "seats"}
              </div>
              <div className="car-spec-box">
                🧳 {car.luggage}{" "}
                {language === "fr" ? "bagages" : "luggage"}
              </div>
              <div className="car-spec-box">
                ⚙️ {car.transmission}
              </div>
              <div className="car-spec-box">
                ⛽ {car.fuel}
              </div>
            </div>

            <div className="car-details-requirements">
              <h3>
                {language === "fr"
                  ? "Conditions du véhicule"
                  : "Vehicle requirements"}
              </h3>
              <div className="car-requirement-item">
                🚗{" "}
                {language === "fr"
                  ? "Âge minimum : 21 ans"
                  : "Minimum age: 21 years"}
              </div>
              <div className="car-requirement-item">
                🪪{" "}
                {language === "fr"
                  ? "Permis valide (3 ans minimum)"
                  : "Valid driving license (3+ years)"}
              </div>
            </div>

            <div className="car-details-price">
              {language === "fr" ? "À partir de " : "From "}
              {formatPrice(car.pricePerDay)}{" "}
              <span>{language === "fr" ? "/ jour" : "/ day"}</span>
            </div>

            <button
              className="car-details-button"
              onClick={() => setShowForm(true)}
            >
              {language === "fr" ? "Réserver" : "Book now"}
            </button>
          </div>
        </div>

        {showForm && (
          <div ref={formRef} className="booking-form-wrapper">
            <BookingForm 
              car={car} 
              onClose={() => setShowForm(false)}
              initialDates={datesFromUrl.startDate ? datesFromUrl : null}
            />
          </div>
        )}
      </div>
    </>
  );
}
