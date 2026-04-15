import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer.jsx";
import { useAuth } from "../context/AuthContext";
import { cancelMyReservation, getMyReservations } from "../api/reservations";
import { useAppContext } from "../context/AppContext.jsx";
import { FALLBACK_CAR_IMAGE, resolveImageUrl } from "../utils/imageUrl.js";
import "./MyReservations.css";

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

function statusLabel(status) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "CONFIRMED") return "Confirmée";
  if (normalized === "ACTIVE") return "En cours";
  if (normalized === "COMPLETED") return "Terminée";
  if (normalized === "CANCELLED") return "Annulée";
  return "En attente";
}

export default function MyReservations() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { formatPrice, language } = useAppContext();
  const navigate = useNavigate();

  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadReservations();
  }, [isAuthenticated]);

  async function loadReservations() {
    setLoading(true);
    setError("");

    try {
      const data = await getMyReservations();
      setReservations(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Impossible de charger vos réservations.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(reservationId) {
    const confirmed = window.confirm("Annuler cette réservation ?");
    if (!confirmed) {
      return;
    }

    try {
      await cancelMyReservation(reservationId);
      setReservations((prev) =>
        prev.map((r) => (r._id === reservationId ? { ...r, status: "CANCELLED" } : r))
      );
    } catch (err) {
      alert(err.message || "Impossible d'annuler cette réservation.");
    }
  }

  const sortedReservations = useMemo(() => {
    return [...reservations].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [reservations]);

  return (
    <>
      <Navbar />
      <div className="my-reservations-page">
        <div className="my-reservations-header">
          <div>
            <h1>Mes réservations</h1>
            <div className="my-reservations-subtitle">
              {language === "fr"
                ? "Retrouvez vos demandes et réservations confirmées."
                : "View your booking requests and confirmed bookings."}
            </div>
          </div>
          <Link className="my-reservations-cta" to="/cars">
            {language === "fr" ? "Réserver un véhicule" : "Book a car"}
          </Link>
        </div>

        {loading ? (
          <div className="my-reservations-state">Chargement...</div>
        ) : error ? (
          <div className="my-reservations-error">{error}</div>
        ) : reservations.length === 0 ? (
          <div className="my-reservations-empty">Aucune réservation pour le moment.</div>
        ) : (
          <div className="my-reservations-grid">
            {sortedReservations.map((reservation) => {
              const car = reservation.car;
              const title = car ? `${car.brand} ${car.model}` : "Véhicule supprimé";
              const image = resolveImageUrl(car?.imageUrl || "");
              const includedKm = computeIncludedKm(reservation.numberOfDays);
              const options = parseOptionsFromNotes(reservation.notes);
              const status = String(reservation.status || "PENDING").toLowerCase();

              return (
                <div key={reservation._id} className="my-res-card">
                  <div className="my-res-card-top">
                    <img
                      className="my-res-image"
                      src={image}
                      alt=""
                      onError={(e) => {
                        e.currentTarget.src = FALLBACK_CAR_IMAGE;
                      }}
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="my-res-main">
                      <div className="my-res-title">{title}</div>
                      <div className="my-res-sub">
                        {car?.category ? `${car.category} — ${language === "fr" ? "ou similaire" : "or similar"}` : ""}
                      </div>
                      <div className={`my-res-status my-res-status-${status}`}>
                        {statusLabel(reservation.status)}
                      </div>
                    </div>
                    <div className="my-res-price">
                      <div className="my-res-price-label">{language === "fr" ? "Total" : "Total"}</div>
                      <div className="my-res-price-value">{formatPrice(reservation.totalPrice)}</div>
                    </div>
                  </div>

                  <div className="my-res-details">
                    <div className="my-res-detail">
                      <div className="my-res-detail-label">{language === "fr" ? "Station" : "Station"}</div>
                      <div className="my-res-detail-value">Paris 12e — Bastille</div>
                    </div>
                    <div className="my-res-detail">
                      <div className="my-res-detail-label">{language === "fr" ? "Départ" : "Start"}</div>
                      <div className="my-res-detail-value">
                        {new Date(reservation.startDate).toLocaleDateString("fr-FR")}{" "}
                        <span className="my-res-muted">{reservation.startTime || "09:00"}</span>
                      </div>
                    </div>
                    <div className="my-res-detail">
                      <div className="my-res-detail-label">{language === "fr" ? "Retour" : "End"}</div>
                      <div className="my-res-detail-value">
                        {new Date(reservation.endDate).toLocaleDateString("fr-FR")}{" "}
                        <span className="my-res-muted">{reservation.endTime || "18:00"}</span>
                      </div>
                    </div>
                    <div className="my-res-detail">
                      <div className="my-res-detail-label">{language === "fr" ? "Km inclus" : "Included km"}</div>
                      <div className="my-res-detail-value">
                        {includedKm ? `${includedKm.toLocaleString("fr-FR")} km` : "—"}
                      </div>
                    </div>
                    <div className="my-res-detail my-res-detail-wide">
                      <div className="my-res-detail-label">{language === "fr" ? "Options" : "Options"}</div>
                      <div className="my-res-detail-value">
                        {options.length ? options.join(" • ") : <span className="my-res-muted">{language === "fr" ? "Aucune" : "None"}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="my-res-actions">
                    <Link className="my-res-view" to={`/reservation-confirmation?id=${encodeURIComponent(reservation._id)}`}>
                      {language === "fr" ? "Voir les détails" : "View details"}
                    </Link>
                    {reservation.status === "PENDING" ? (
                      <button className="my-res-cancel" onClick={() => handleCancel(reservation._id)} type="button">
                        {language === "fr" ? "Annuler" : "Cancel"}
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
