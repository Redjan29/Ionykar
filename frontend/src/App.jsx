import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import CarCard from "./components/CarCard";
import Navbar from "./components/Navbar";
import { fetchCars } from "./api/cars";
import { useAuth } from "./context/AuthContext.jsx";

function App() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const shouldRedirectAdmin = !authLoading && isAuthenticated && user?.isAdmin;

  useEffect(() => {
    let isMounted = true;

    fetchCars()
      .then((data) => {
        if (isMounted) {
          setCars(data);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Impossible de charger les voitures.");
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
  }, []);

  if (shouldRedirectAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <>
      <Navbar />
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "24px",
          padding: "40px",
          background: "#e5e7eb",
          minHeight: "100vh",
        }}
      >
        {loading && <p>Chargement...</p>}
        {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
        {!loading && !error && cars.length === 0 && (
          <p>Aucune voiture disponible.</p>
        )}
        {cars.map((car) => (
          <CarCard key={car.id} {...car} />
        ))}
      </div>
    </>
  );
}

export default App;
