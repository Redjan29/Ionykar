import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useAppContext } from "../context/AppContext.jsx";
import { getReservationById } from "../api/reservations.js";
import { FALLBACK_CAR_IMAGE, resolveImageUrl } from "../utils/imageUrl.js";
import "./ReservationConfirmation.css";

function computeIncludedKm(days) {
  const d = Math.max(0, Number(days || 0));
  if (!Number.isFinite(d) || d <= 0) return null;
  const weeks = Math.ceil(d / 7);
  const months = Math.ceil(d / 30);
  const perDay = 150 * d;
  const perWeek = 800 * weeks;
  const perMonth = 3000 * months;
  return Math.min(perDay, perWeek, perMonth);
}

function parseOptionsFromNotes(notes) {
  const raw = String(notes || "");
  if (!raw) return [];
  return raw
    .split("|")
    .map((s) => s.trim())
    .filter((line) => line.toLowerCase().startsWith("option:"))
    .map((line) => line.replace(/^option:\s*/i, ""));
}

function statusLabel(status, language) {
  const normalized = String(status || "").toUpperCase();
  if (language === "fr") {
    if (normalized === "CONFIRMED") return "Confirmée";
    if (normalized === "ACTIVE") return "En cours";
    if (normalized === "COMPLETED") return "Terminée";
    if (normalized === "CANCELLED") return "Annulée";
    return "En attente";
  }
  return normalized || "PENDING";
}

export default function ReservationConfirmation() {
  const { isAuthenticated, token } = useAuth();
  const { language, formatPrice } = useAppContext();
  const [searchParams] = useSearchParams();
  const reservationId = searchParams.get("id") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reservation, setReservation] = useState(null);

  useEffect(() => {
    let isMounted = true;
    if (!token || !reservationId) return undefined;
    setLoading(true);
    setError("");
    getReservationById(token, reservationId)
      .then((data) => {
        if (!isMounted) return;
        setReservation(data);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err?.message || "Impossible de charger la réservation.");
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [reservationId, token]);

  const includedKm = useMemo(() => computeIncludedKm(reservation?.numberOfDays), [reservation?.numberOfDays]);
  const options = useMemo(() => parseOptionsFromNotes(reservation?.notes), [reservation?.notes]);
  const carImage = useMemo(() => resolveImageUrl(reservation?.car?.imageUrl || ""), [reservation?.car?.imageUrl]);

  if (!reservationId) return <Navigate to="/my-reservations" replace />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const isConfirmed = String(reservation?.status || "").toUpperCase() === "CONFIRMED";

  return (
    <>
      <Navbar />
      <div className="confirm-page">
        <div className="confirm-container">
          <div className="confirm-hero">
            <div>
              <div className={`confirm-pill ${isConfirmed ? "ok" : "pending"}`}>
                {statusLabel(reservation?.status, language)}
              </div>
              <h1 className="confirm-title">
                {language === "fr"
                  ? isConfirmed
                    ? "Votre réservation est confirmée !"
                    : "Votre demande de réservation est enregistrée !"
                  : isConfirmed
                    ? "Your booking is confirmed!"
                    : "Your booking request is received!"}
              </h1>
              <p className="confirm-subtitle">
                {language === "fr"
                  ? "Les instructions de départ ainsi que votre contrat de location à signer vous seront envoyés par e-mail 1 heure avant le début de votre location."
                  : "Departure instructions and your rental contract to sign will be emailed 1 hour before your rental starts."}
              </p>
              <div className="confirm-actions">
                <Link className="confirm-primary" to="/my-reservations">
                  {language === "fr" ? "Aller à mes réservations" : "Go to my bookings"}
                </Link>
                <Link className="confirm-secondary" to="/cars">
                  {language === "fr" ? "Retour aux véhicules" : "Back to cars"}
                </Link>
              </div>
            </div>
            <div className="confirm-card">
              {loading ? (
                <div className="confirm-state">Chargement...</div>
              ) : error ? (
                <div className="confirm-state confirm-error">{error}</div>
              ) : reservation ? (
                <>
                  <div className="confirm-card-top">
                    <img
                      className="confirm-car-image"
                      src={carImage}
                      alt=""
                      onError={(e) => {
                        e.currentTarget.src = FALLBACK_CAR_IMAGE;
                      }}
                      loading="eager"
                      decoding="async"
                    />
                    <div className="confirm-car-main">
                      <div className="confirm-car-title">
                        {reservation.car ? `${reservation.car.brand} ${reservation.car.model}` : "Véhicule"}
                      </div>
                      <div className="confirm-car-sub">
                        {reservation.car?.category ? `${reservation.car.category} — ${language === "fr" ? "ou similaire" : "or similar"}` : ""}
                      </div>
                    </div>
                  </div>

                  <div className="confirm-grid">
                    <div className="confirm-row">
                      <div className="confirm-label">{language === "fr" ? "Station" : "Station"}</div>
                      <div className="confirm-value">Paris 12e — Bastille</div>
                    </div>
                    <div className="confirm-row">
                      <div className="confirm-label">{language === "fr" ? "Départ" : "Start"}</div>
                      <div className="confirm-value">
                        {new Date(reservation.startDate).toLocaleDateString("fr-FR")}{" "}
                        <span className="confirm-muted">{reservation.startTime || "09:00"}</span>
                      </div>
                    </div>
                    <div className="confirm-row">
                      <div className="confirm-label">{language === "fr" ? "Retour" : "End"}</div>
                      <div className="confirm-value">
                        {new Date(reservation.endDate).toLocaleDateString("fr-FR")}{" "}
                        <span className="confirm-muted">{reservation.endTime || "18:00"}</span>
                      </div>
                    </div>
                    <div className="confirm-row">
                      <div className="confirm-label">{language === "fr" ? "Kilométrage inclus" : "Included mileage"}</div>
                      <div className="confirm-value">
                        {includedKm ? `${includedKm.toLocaleString("fr-FR")} km` : "—"}
                      </div>
                    </div>

                    <div className="confirm-row">
                      <div className="confirm-label">{language === "fr" ? "Options" : "Options"}</div>
                      <div className="confirm-value">
                        {options.length ? (
                          <ul className="confirm-options">
                            {options.map((opt) => (
                              <li key={opt}>{opt}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="confirm-muted">{language === "fr" ? "Aucune" : "None"}</span>
                        )}
                      </div>
                    </div>

                    <div className="confirm-row">
                      <div className="confirm-label">{language === "fr" ? "Montant total" : "Total paid"}</div>
                      <div className="confirm-value confirm-amount">
                        {formatPrice(reservation.totalPrice)}
                      </div>
                    </div>
                    <div className="confirm-row">
                      <div className="confirm-label">{language === "fr" ? "Caution pré-autorisée" : "Pre-authorized deposit"}</div>
                      <div className="confirm-value confirm-amount">{formatPrice(1500)}</div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="confirm-state">{language === "fr" ? "Réservation introuvable." : "Reservation not found."}</div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

