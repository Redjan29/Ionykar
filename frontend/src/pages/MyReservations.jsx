import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer.jsx";
import { useAuth } from "../context/AuthContext";
import { cancelMyReservation, getMyReservations } from "../api/reservations";
import "./MyReservations.css";

export default function MyReservations() {
  const { isAuthenticated, token, loading: authLoading } = useAuth();
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
    if (!isAuthenticated || !token) {
      setLoading(false);
      return;
    }

    loadReservations();
  }, [isAuthenticated, token]);

  async function loadReservations() {
    setLoading(true);
    setError("");

    try {
      const data = await getMyReservations(token);
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
      await cancelMyReservation(token, reservationId);
      setReservations((prev) =>
        prev.map((r) => (r._id === reservationId ? { ...r, status: "CANCELLED" } : r))
      );
    } catch (err) {
      alert(err.message || "Impossible d'annuler cette réservation.");
    }
  }

  return (
    <>
      <Navbar />
      <div className="my-reservations-page">
        <h1>Mes réservations</h1>

        {loading ? (
          <p>Chargement...</p>
        ) : error ? (
          <div className="my-reservations-error">{error}</div>
        ) : reservations.length === 0 ? (
          <div className="my-reservations-empty">Aucune réservation pour le moment.</div>
        ) : (
          <table className="my-reservations-table">
            <thead>
              <tr>
                <th>Voiture</th>
                <th>Dates</th>
                <th>Prix</th>
                <th>Statut</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((reservation) => (
                <tr key={reservation._id}>
                  <td>
                    {reservation.car
                      ? `${reservation.car.brand} ${reservation.car.model}`
                      : "Voiture supprimée"}
                  </td>
                  <td>
                    {new Date(reservation.startDate).toLocaleDateString()} → {" "}
                    {new Date(reservation.endDate).toLocaleDateString()}
                  </td>
                  <td>{reservation.totalPrice}€</td>
                  <td>
                    <span className={`reservation-status ${reservation.status.toLowerCase()}`}>
                      {reservation.status}
                    </span>
                  </td>
                  <td>
                    {reservation.status === "PENDING" ? (
                      <button
                        className="cancel-btn"
                        onClick={() => handleCancel(reservation._id)}
                      >
                        Annuler
                      </button>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Footer />
    </>
  );
}
