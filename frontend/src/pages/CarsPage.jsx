import { useEffect, useMemo, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import CarCard from "../components/CarCard";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { fetchCars } from "../api/cars";
import { useAuth } from "../context/AuthContext.jsx";
import CarDetailsModal from "../components/CarDetailsModal.jsx";
import "./CarsPage.css";

function CarsPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCar, setSelectedCar] = useState(null);
  const shouldRedirectAdmin = !authLoading && isAuthenticated && user?.isAdmin;
  
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const threeDaysLater = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d;
  }, []);

  const urlState = useMemo(() => {
    const startDate = searchParams.get("startDate") || "";
    const startTime = searchParams.get("startTime") || "";
    const endDate = searchParams.get("endDate") || "";
    const endTime = searchParams.get("endTime") || "";
    const station = searchParams.get("station") || "bastille";
    const category = searchParams.get("category") || "";
    const transmission = searchParams.get("transmission") || "";

    return {
      station,
      startDate,
      startTime,
      endDate,
      endTime,
      category,
      transmission,
    };
  }, [searchParams]);

  const [editOpen, setEditOpen] = useState(false);
  const [criteria, setCriteria] = useState({
    station: "bastille",
    startDate: formatDate(today),
    startTime: "09:00",
    endDate: formatDate(threeDaysLater),
    endTime: "18:00",
  });

  const [filters, setFilters] = useState({
    category: "",
    transmission: "",
  });

  const modalCarId = searchParams.get("car") || "";
  const hasSelectedDates = Boolean(urlState.startDate && urlState.endDate);

  useEffect(() => {
    setCriteria({
      station: urlState.station || "bastille",
      startDate: urlState.startDate || formatDate(today),
      startTime: urlState.startTime || "09:00",
      endDate: urlState.endDate || formatDate(threeDaysLater),
      endTime: urlState.endTime || "18:00",
    });
    setFilters({
      category: urlState.category || "",
      transmission: urlState.transmission || "",
    });
  }, [threeDaysLater, today, urlState]);

  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (const minute of ["00", "30"]) {
        const time = `${String(hour).padStart(2, "0")}:${minute}`;
        options.push(
          <option key={time} value={time}>
            {time}
          </option>
        );
      }
    }
    return options;
  };

  const datesFromUrl = useMemo(() => {
    return {
      startDate: urlState.startDate,
      startTime: urlState.startTime,
      endDate: urlState.endDate,
      endTime: urlState.endTime,
      station: urlState.station,
    };
  }, [urlState]);

  useEffect(() => {
    let isMounted = true;

    fetchCars({
      startDate: datesFromUrl.startDate,
      endDate: datesFromUrl.endDate,
    })
      .then((data) => {
        if (isMounted) {
          const allowedCategories = ["CITADINE", "BERLINE", "BREAK", "SUV", "LUXE"];
          const filtered = data.filter((car) =>
            allowedCategories.includes(String(car.category).toUpperCase())
          );
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
  }, [datesFromUrl.startDate, datesFromUrl.endDate]);

  const visibleCars = useMemo(() => {
    const categoryParam = filters.category?.trim();
    const transmissionParam = filters.transmission?.trim();

    return cars.filter((car) => {
      if (categoryParam) {
        if (String(car.category).toUpperCase() !== categoryParam.toUpperCase()) return false;
      }
      if (transmissionParam) {
        if (String(car.transmission).toUpperCase() !== transmissionParam.toUpperCase()) {
          return false;
        }
      }
      return true;
    });
  }, [cars, filters.category, filters.transmission]);

  const applyToUrl = (nextCriteria, nextFilters) => {
    const params = new URLSearchParams(searchParams);

    params.set("station", nextCriteria.station || "bastille");
    params.set("startDate", nextCriteria.startDate || "");
    params.set("startTime", nextCriteria.startTime || "");
    params.set("endDate", nextCriteria.endDate || "");
    params.set("endTime", nextCriteria.endTime || "");

    if (nextFilters.category) params.set("category", nextFilters.category);
    else params.delete("category");

    if (nextFilters.transmission) params.set("transmission", nextFilters.transmission);
    else params.delete("transmission");

    setSearchParams(params, { replace: true });
  };

  const handleCriteriaChange = (e) => {
    const { name, value } = e.target;
    setCriteria((prev) => ({ ...prev, [name]: value }));
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => {
      const next = { ...prev, [name]: value };
      applyToUrl(criteria, next);
      return next;
    });
  };

  const handleApplySearch = () => {
    if (!criteria.startDate || !criteria.endDate) {
      alert("Veuillez choisir des dates de départ et de retour");
      return;
    }

    const start = new Date(criteria.startDate);
    const end = new Date(criteria.endDate);
    if (start < today) {
      alert("La date de départ ne peut pas être antérieure à aujourd'hui");
      return;
    }
    if (end < today) {
      alert("La date de retour ne peut pas être antérieure à aujourd'hui");
      return;
    }
    if (start >= end) {
      alert("La date de retour doit être après la date de départ");
      return;
    }

    applyToUrl(criteria, filters);
    setEditOpen(false);
    setLoading(true);
  };

  const humanStation = (station) => {
    if (station === "bastille") return "Paris 12e — Bastille";
    return station || "Station";
  };

  const dateLabel = (iso) => {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleDateString("fr-FR");
    } catch {
      return iso;
    }
  };

  if (shouldRedirectAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <>
      <Navbar />
      <div className="cars-page">
        <section className="cars-criteria">
          <div className="cars-criteria-row">
            <div className="cars-criteria-main">
              <div className="cars-criteria-title">Véhicules disponibles</div>
              <div className="cars-criteria-sub">
                <span className="cars-chip">{humanStation(datesFromUrl.station)}</span>
                {datesFromUrl.startDate && datesFromUrl.endDate && (
                  <span className="cars-chip">
                    Du {dateLabel(datesFromUrl.startDate)} au {dateLabel(datesFromUrl.endDate)}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              className="cars-criteria-edit"
              onClick={() => setEditOpen((v) => !v)}
            >
              {editOpen ? "Fermer" : "Modifier"}
            </button>
          </div>

          {editOpen && (
            <div className="cars-criteria-panel">
              <div className="cars-criteria-grid">
                <div className="cars-field">
                  <label>Station</label>
                  <select name="station" value={criteria.station} onChange={handleCriteriaChange}>
                    <option value="bastille">Paris 12e — Bastille</option>
                  </select>
                </div>
                <div className="cars-field">
                  <label>Date de départ</label>
                  <input
                    type="date"
                    name="startDate"
                    value={criteria.startDate}
                    min={formatDate(today)}
                    onChange={handleCriteriaChange}
                    onClick={(e) => e.currentTarget.showPicker?.()}
                  />
                </div>
                <div className="cars-field">
                  <label>Heure de départ</label>
                  <select
                    name="startTime"
                    value={criteria.startTime}
                    onChange={handleCriteriaChange}
                  >
                    {generateTimeOptions()}
                  </select>
                </div>
                <div className="cars-field">
                  <label>Date de retour</label>
                  <input
                    type="date"
                    name="endDate"
                    value={criteria.endDate}
                    min={criteria.startDate || formatDate(today)}
                    onChange={handleCriteriaChange}
                    onClick={(e) => e.currentTarget.showPicker?.()}
                  />
                </div>
                <div className="cars-field">
                  <label>Heure de retour</label>
                  <select name="endTime" value={criteria.endTime} onChange={handleCriteriaChange}>
                    {generateTimeOptions()}
                  </select>
                </div>
                <div className="cars-field cars-field-cta">
                  <button type="button" className="cars-apply" onClick={handleApplySearch}>
                    Mettre à jour
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="cars-filters">
            <div className="cars-field">
              <label>Catégorie</label>
              <select name="category" value={filters.category} onChange={handleFilterChange}>
                <option value="">Toutes</option>
                <option value="CITADINE">Citadine</option>
                <option value="BERLINE">Berline</option>
                <option value="BREAK">Break</option>
                <option value="SUV">SUV</option>
                <option value="LUXE">Luxe</option>
              </select>
            </div>
            <div className="cars-field">
              <label>Transmission</label>
              <select name="transmission" value={filters.transmission} onChange={handleFilterChange}>
                <option value="">Toutes</option>
                <option value="AUTO">Automatique</option>
                <option value="MANUELLE">Manuelle</option>
              </select>
            </div>
            <div className="cars-filters-count">
              {!loading && !error && (
                <span>
                  {visibleCars.length} véhicule{visibleCars.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </section>

        {loading && <div className="cars-page-state">Chargement...</div>}
        {error && <div className="cars-page-state" style={{ color: "#ffb4b4" }}>{error}</div>}
        {!loading && !error && visibleCars.length === 0 && (
          <div className="cars-page-state">Aucune voiture disponible.</div>
        )}
        {!loading && !error && visibleCars.length > 0 && (
          <div className="cars-page-grid">
            {visibleCars.map((car) => (
              <CarCard
                key={car._id || car.slug || car.id}
                {...car}
                searchParams={datesFromUrl.startDate ? datesFromUrl : null}
                hasSelectedDates={hasSelectedDates}
                onChooseDates={() => {
                  setEditOpen(true);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                onBook={() => setSelectedCar(car)}
              />
            ))}
          </div>
        )}
      </div>

      {(selectedCar || modalCarId) && (
        <CarDetailsModal
          carId={modalCarId || selectedCar.slug || selectedCar._id || selectedCar.id}
          initialDates={datesFromUrl.startDate ? datesFromUrl : null}
          onClose={() => {
            setSelectedCar(null);
            if (modalCarId) {
              const params = new URLSearchParams(searchParams);
              params.delete("car");
              setSearchParams(params, { replace: true });
            }
          }}
        />
      )}
      <Footer />
    </>
  );
}

export default CarsPage;
