import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import CarCard from "../components/CarCard";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { fetchCars } from "../api/cars";
import { useAuth } from "../context/AuthContext.jsx";
import "./CarsPage.css";

function CarsPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const shouldRedirectAdmin = !authLoading && isAuthenticated && user?.isAdmin;
  
  // Récupérer les dates des query params
  const datesFromUrl = {
    startDate: searchParams.get("startDate") || "",
    startTime: searchParams.get("startTime") || "",
    endDate: searchParams.get("endDate") || "",
    endTime: searchParams.get("endTime") || "",
  };

  useEffect(() => {
    let isMounted = true;

    fetchCars({
      startDate: datesFromUrl.startDate,
      endDate: datesFromUrl.endDate,
    })
      .then((data) => {
        if (isMounted) {
          // Category filtering (align with backend enums)
          const allowedCategories = ["CITADINE", "BERLINE", "BREAK", "SUV", "LUXE"];
          const categoryParam = searchParams.get("category");
          let filtered = data;
          if (categoryParam) {
            filtered = data.filter(
              (car) =>
                allowedCategories.includes(String(car.category).toUpperCase()) &&
                String(car.category).toUpperCase() === categoryParam.toUpperCase()
            );
          } else {
            filtered = data.filter((car) =>
              allowedCategories.includes(String(car.category).toUpperCase())
            );
          }
          setCars(filtered);
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
  }, [datesFromUrl.startDate, datesFromUrl.endDate, searchParams]);

  if (shouldRedirectAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <>
      <Navbar />
      <div className="cars-page">
        {loading && <div className="cars-page-state">Chargement...</div>}
        {error && <div className="cars-page-state" style={{ color: "#ffb4b4" }}>{error}</div>}
        {!loading && !error && cars.length === 0 && (
          <div className="cars-page-state">Aucune voiture disponible.</div>
        )}
        {!loading && !error && cars.length > 0 && (
          <div className="cars-page-grid">
            {cars.map((car) => (
              <CarCard
                key={car._id || car.slug || car.id}
                {...car}
                searchParams={datesFromUrl.startDate ? datesFromUrl : null}
              />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}

export default CarsPage;
