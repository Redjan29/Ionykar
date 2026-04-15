import { Fragment, useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer.jsx";
import { useAuth } from "../context/AuthContext";
import {
  getDashboardStats,
  getAllReservations,
  getAllUsers,
  getAllCars,
  createCar,
  getMaintenanceRecords,
  createMaintenanceRecord,
  deleteMaintenanceRecord,
  updateReservationStatus,
  updateCar,
  updateUser,
  getBlockedPeriods,
  getAllBlockedPeriods,
  createBlockedPeriod,
  deleteBlockedPeriod,
  getFinanceProfitability,
  getFinanceSummary,
  getFinanceRevenueTimeseries,
  getFinanceCharges,
  createFinanceCharge,
  deleteFinanceCharge,
  updateCarInvestment,
  uploadCarImages as uploadCarImagesApi,
  reviewUserDocument,
  reviewUserProfile,
} from "../api/admin";
import "./Admin.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

const FALLBACK_CAR_IMAGE =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Crect width='100%25' height='100%25' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%236b7280' font-family='Arial' font-size='14'%3ECar%3C/text%3E%3C/svg%3E";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function resolveImageUrl(url) {
  if (!url || typeof url !== "string") {
    return FALLBACK_CAR_IMAGE;
  }

  const normalized = url.trim();

  if (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("data:")
  ) {
    return url;
  }

  // Legacy seeded images are served by the frontend static folder (e.g. /cars/*)
  if (normalized.startsWith("/cars/")) {
    return normalized;
  }

  // Admin uploads are served by backend (/uploads/*)
  if (normalized.startsWith("/uploads/")) {
    return `${API_BASE_URL}${normalized}`;
  }

  if (normalized.startsWith("uploads/")) {
    return `${API_BASE_URL}/${normalized}`;
  }

  if (normalized.startsWith("/")) {
    return normalized;
  }

  return normalized;
}

function getCarGalleryImages(car) {
  const images = [];

  if (car?.imageUrl && typeof car.imageUrl === "string" && car.imageUrl.trim()) {
    images.push(car.imageUrl.trim());
  }

  if (Array.isArray(car?.imageUrls)) {
    car.imageUrls.forEach((url) => {
      if (typeof url === "string" && url.trim()) {
        images.push(url.trim());
      }
    });
  }

  return Array.from(new Set(images));
}

function CarPhotoHoverSlideshow({ car }) {
  const images = getCarGalleryImages(car);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    setActiveIndex(0);
  }, [car?._id, images.length]);

  useEffect(() => {
    if (!hovered || images.length <= 1) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      setActiveIndex((previous) => (previous + 1) % images.length);
    }, 900);

    return () => clearInterval(intervalId);
  }, [hovered, images.length]);

  const activeImage = resolveImageUrl(images[activeIndex]);

  return (
    <div
      className="car-photo-thumb-wrapper"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setActiveIndex(0);
      }}
      title={images.length > 1 ? "Survoler pour faire défiler les images" : "Aperçu véhicule"}
    >
      <img
        className="car-photo-thumb"
        src={activeImage}
        alt={`${car.brand} ${car.model}`}
        onError={(event) => {
          event.currentTarget.src = FALLBACK_CAR_IMAGE;
        }}
      />
      {images.length > 1 && (
        <span className="car-photo-thumb-badge">
          {activeIndex + 1}/{images.length}
        </span>
      )}
    </div>
  );
}


export default function Admin() {
  const { user, token, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [stats, setStats] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [users, setUsers] = useState([]);
  const [cars, setCars] = useState([]);
  const [maintenanceData, setMaintenanceData] = useState({ records: [], summary: null });
  const [financeProfitability, setFinanceProfitability] = useState({ vehicles: [], totals: {} });
  const [financeSummary, setFinanceSummary] = useState(null);
  const [financeRevenueSeries, setFinanceRevenueSeries] = useState(null);
  const [financeRevenueSeriesPrev, setFinanceRevenueSeriesPrev] = useState(null);
  const [financeCharges, setFinanceCharges] = useState([]);
  const [financeFilters, setFinanceFilters] = useState(() => ({
    year: String(new Date().getFullYear()),
    month: "",
    carId: "",
  }));
  const [locationsMenuOpen, setLocationsMenuOpen] = useState(true);
  const [fleetMenuOpen, setFleetMenuOpen] = useState(true);
  const [clientsMenuOpen, setClientsMenuOpen] = useState(true);
  const [financesMenuOpen, setFinancesMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Rediriger si pas admin
  useEffect(() => {
    if (!isAuthenticated || !user?.isAdmin) {
      navigate("/");
    }
  }, [isAuthenticated, user, navigate]);

  const loadData = useCallback(async () => {
    if (!user?.isAdmin || !token) return;
    setLoading(true);
    setError("");

    try {
      if (activeTab === "dashboard") {
        const response = await getDashboardStats(token);
        setStats(response);
      } else if (
        activeTab === "location-list" ||
        activeTab === "departures-returns" ||
        activeTab === "reservations"
      ) {
        const response = await getAllReservations(token);
        setReservations(response);
      } else if (
        activeTab === "client-list" ||
        activeTab === "client-documents" ||
        activeTab === "users"
      ) {
        const response = await getAllUsers(token);
        setUsers(response);
      } else if (activeTab === "cars" || activeTab === "fleet-categories") {
        const response = await getAllCars(token);
        setCars(response);
      } else if (activeTab === "maintenance") {
        const [carsResponse, maintenanceResponse] = await Promise.all([
          getAllCars(token),
          getMaintenanceRecords(token, { year: new Date().getFullYear() }),
        ]);
        setCars(carsResponse);
        setMaintenanceData(maintenanceResponse);
      } else if (activeTab === "finance-profitability") {
        const response = await getFinanceProfitability(token, financeFilters);
        setFinanceProfitability(response);
      } else if (activeTab === "finance-expenses") {
        const [carsResponse, chargesResponse] = await Promise.all([
          getAllCars(token),
          getFinanceCharges(token, financeFilters),
        ]);
        setCars(carsResponse);
        setFinanceCharges(chargesResponse);
      } else if (activeTab === "finance-summary") {
        const yearNum = Number(financeFilters.year || new Date().getFullYear());
        const monthNum = financeFilters.month ? Number(financeFilters.month) : "";
        const granularity = monthNum ? "day" : "month";

        const [carsRes, summaryRes, seriesRes, seriesPrevRes] = await Promise.all([
          getAllCars(token),
          getFinanceSummary(token, financeFilters),
          getFinanceRevenueTimeseries(token, { ...financeFilters, granularity }),
          getFinanceRevenueTimeseries(token, {
            year: String(Number.isFinite(yearNum) ? yearNum - 1 : new Date().getFullYear() - 1),
            month: financeFilters.month || "",
            carId: financeFilters.carId || "",
            granularity,
          }),
        ]);
        setCars(carsRes);
        setFinanceSummary(summaryRes);
        setFinanceRevenueSeries(seriesRes);
        setFinanceRevenueSeriesPrev(seriesPrevRes);
      }
    } catch (err) {
      setError(err.message || "Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  }, [user, token, activeTab, financeFilters.year, financeFilters.month, financeFilters.carId]);

  // Charger les données initiales
  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleUpdateReservationStatus(reservationId, newStatus) {
    try {
      await updateReservationStatus(token, reservationId, newStatus);
      loadData(); // Recharger les données
    } catch (err) {
      alert(err.message || "Erreur lors de la mise à jour");
    }
  }

  async function handleToggleUserActive(userId, currentActive) {
    try {
      await updateUser(token, userId, { isActive: !currentActive });
      loadData();
    } catch (err) {
      alert(err.message || "Erreur lors de la mise à jour");
    }
  }

  async function handleUpdateCar(carId, updates) {
    try {
      await updateCar(token, carId, updates);
      loadData();
    } catch (err) {
      alert(err.message || "Erreur lors de la mise à jour de la voiture");
      throw err;
    }
  }

  async function handleCreateCar(payload) {
    try {
      const createdCar = await createCar(token, payload);
      await loadData();
      return createdCar;
    } catch (err) {
      throw new Error(err.message || "Erreur lors de la création du véhicule");
    }
  }

  async function handleUpdateInvestment(carId, payload) {
    try {
      await updateCarInvestment(token, carId, payload);
      await loadData();
    } catch (err) {
      throw new Error(err.message || "Erreur lors de la mise à jour de l'investissement");
    }
  }

  async function handleCreateFinanceCharge(payload) {
    try {
      await createFinanceCharge(token, payload);
      await loadData();
    } catch (err) {
      throw new Error(err.message || "Erreur lors de la création de la charge");
    }
  }

  async function handleDeleteFinanceCharge(chargeId) {
    try {
      await deleteFinanceCharge(token, chargeId);
      await loadData();
    } catch (err) {
      throw new Error(err.message || "Erreur lors de la suppression de la charge");
    }
  }

  const tabs = {
    dashboard: "Dashboard",
    "location-list": "Liste des locations",
    calendar: "Planning",
    "departures-returns": "Départs / retours",
    cars: "Liste des véhicules",
    maintenance: "Entretiens",
    "fleet-categories": "Catégories",
    "client-list": "Liste des clients",
    "client-documents": "Documents",
    "finance-profitability": "Rentabilité",
    "finance-expenses": "Charges",
    "finance-summary": "Résumé",
  };

  if (!user?.isAdmin) {
    return null; // ou un loader
  }

  return (
    <>
      <Navbar />
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <nav className="admin-nav">
            <button
              className={activeTab === "dashboard" ? "admin-nav-item active" : "admin-nav-item"}
              onClick={() => setActiveTab("dashboard")}
            >
              <span className="admin-nav-icon">📊</span>
              <span>Dashboard</span>
            </button>

            <div className="admin-nav-section">
              <button
                className="admin-nav-section-header"
                onClick={() => setLocationsMenuOpen(!locationsMenuOpen)}
              >
                <span className="admin-nav-icon">📅</span>
                <span>Locations</span>
                <span className="admin-nav-chevron">{locationsMenuOpen ? "▼" : "▶"}</span>
              </button>
              {locationsMenuOpen && (
                <div className="admin-nav-subsection">
                  <button
                    className={activeTab === "location-list" ? "admin-nav-subitem active" : "admin-nav-subitem"}
                    onClick={() => setActiveTab("location-list")}
                  >
                    Liste des locations
                  </button>
                  <button
                    className={activeTab === "calendar" ? "admin-nav-subitem active" : "admin-nav-subitem"}
                    onClick={() => setActiveTab("calendar")}
                  >
                    Planning
                  </button>
                  <button
                    className={activeTab === "departures-returns" ? "admin-nav-subitem active" : "admin-nav-subitem"}
                    onClick={() => setActiveTab("departures-returns")}
                  >
                    Départs / retours
                  </button>
                </div>
              )}
            </div>

            <div className="admin-nav-section">
              <button
                className="admin-nav-section-header"
                onClick={() => setFleetMenuOpen(!fleetMenuOpen)}
              >
                <span className="admin-nav-icon">🚗</span>
                <span>Flotte</span>
                <span className="admin-nav-chevron">{fleetMenuOpen ? "▼" : "▶"}</span>
              </button>
              {fleetMenuOpen && (
                <div className="admin-nav-subsection">
                  <button
                    className={activeTab === "cars" ? "admin-nav-subitem active" : "admin-nav-subitem"}
                    onClick={() => setActiveTab("cars")}
                  >
                    Liste des véhicules
                  </button>
                  <button
                    className={activeTab === "maintenance" ? "admin-nav-subitem active" : "admin-nav-subitem"}
                    onClick={() => setActiveTab("maintenance")}
                  >
                    Maintenance (entretiens)
                  </button>
                  <button
                    className={activeTab === "fleet-categories" ? "admin-nav-subitem active" : "admin-nav-subitem"}
                    onClick={() => setActiveTab("fleet-categories")}
                  >
                    Catégories
                  </button>
                </div>
              )}
            </div>

            <div className="admin-nav-section">
              <button
                className="admin-nav-section-header"
                onClick={() => setClientsMenuOpen(!clientsMenuOpen)}
              >
                <span className="admin-nav-icon">👥</span>
                <span>Clients</span>
                <span className="admin-nav-chevron">{clientsMenuOpen ? "▼" : "▶"}</span>
              </button>
              {clientsMenuOpen && (
                <div className="admin-nav-subsection">
                  <button
                    className={activeTab === "client-list" ? "admin-nav-subitem active" : "admin-nav-subitem"}
                    onClick={() => setActiveTab("client-list")}
                  >
                    Liste des clients
                  </button>
                  <button
                    className={activeTab === "client-documents" ? "admin-nav-subitem active" : "admin-nav-subitem"}
                    onClick={() => setActiveTab("client-documents")}
                  >
                    Documents
                  </button>
                </div>
              )}
            </div>

            <div className="admin-nav-section">
              <button
                className="admin-nav-section-header"
                onClick={() => setFinancesMenuOpen(!financesMenuOpen)}
              >
                <span className="admin-nav-icon">💶</span>
                <span>Finances</span>
                <span className="admin-nav-chevron">{financesMenuOpen ? "▼" : "▶"}</span>
              </button>
              {financesMenuOpen && (
                <div className="admin-nav-subsection">
                  <button
                    className={activeTab === "finance-profitability" ? "admin-nav-subitem active" : "admin-nav-subitem"}
                    onClick={() => setActiveTab("finance-profitability")}
                  >
                    Rentabilité
                  </button>
                  <button
                    className={activeTab === "finance-expenses" ? "admin-nav-subitem active" : "admin-nav-subitem"}
                    onClick={() => setActiveTab("finance-expenses")}
                  >
                    Charges
                  </button>
                  <button
                    className={activeTab === "finance-summary" ? "admin-nav-subitem active" : "admin-nav-subitem"}
                    onClick={() => setActiveTab("finance-summary")}
                  >
                    Résumé
                  </button>
                </div>
              )}
            </div>
          </nav>
        </aside>

        <main className="admin-main">
          <header className="admin-header">
            <h1>{tabs[activeTab] || "Administration"}</h1>
          </header>

          {error && <div className="admin-error">{error}</div>}

          <div className="admin-content">
          {loading ? (
            <p>Chargement...</p>
          ) : (
            <>
              {activeTab === "dashboard" && stats && (
                <DashboardView stats={stats} />
              )}

              {activeTab === "location-list" && (
                <ReservationsView
                  reservations={reservations}
                  onUpdateStatus={handleUpdateReservationStatus}
                />
              )}

              {activeTab === "client-list" && (
                <UsersView
                  users={users}
                  onToggleActive={handleToggleUserActive}
                />
              )}

              {activeTab === "cars" && (
                <CarsView cars={cars} onUpdateCar={handleUpdateCar} onCreateCar={handleCreateCar} />
              )}

              {activeTab === "maintenance" && (
                <MaintenanceView
                  token={token}
                  cars={cars}
                  initialData={maintenanceData}
                />
              )}

              {activeTab === "calendar" && (
                <CalendarView token={token} />
              )}

              {activeTab === "departures-returns" && (
                <DeparturesReturnsView reservations={reservations} />
              )}

              {activeTab === "fleet-categories" && (
                <FleetCategoriesView cars={cars} />
              )}

              {activeTab === "client-documents" && (
                <ClientDocumentsView users={users} token={token} onRefresh={loadData} />
              )}

              {activeTab === "finance-profitability" && (
                <FinanceProfitabilityView
                  profitability={financeProfitability}
                  onUpdateInvestment={handleUpdateInvestment}
                  financeFilters={financeFilters}
                  onChangeFinanceFilters={setFinanceFilters}
                />
              )}

              {activeTab === "finance-expenses" && (
                <FinanceChargesView
                  cars={cars}
                  charges={financeCharges}
                  onCreateCharge={handleCreateFinanceCharge}
                  onDeleteCharge={handleDeleteFinanceCharge}
                  financeFilters={financeFilters}
                  onChangeFinanceFilters={setFinanceFilters}
                />
              )}

              {activeTab === "finance-summary" && (
                <FinanceSummaryView
                  summary={financeSummary}
                  revenueSeries={financeRevenueSeries}
                  revenueSeriesPrev={financeRevenueSeriesPrev}
                  cars={cars}
                  financeFilters={financeFilters}
                  onChangeFinanceFilters={setFinanceFilters}
                />
              )}
            </>
          )}
        </div>
        </main>
      </div>
      <Footer />
    </>
  );
}

function DeparturesReturnsView({ reservations = [] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const departuresToday = reservations.filter((reservation) => {
    const startDate = new Date(reservation.startDate);
    return startDate >= today && startDate < tomorrow;
  });

  const returnsToday = reservations.filter((reservation) => {
    const endDate = new Date(reservation.endDate);
    return endDate >= today && endDate < tomorrow;
  });

  const rows = [
    ...departuresToday.map((reservation) => ({
      type: "Départ",
      reservation,
    })),
    ...returnsToday.map((reservation) => ({
      type: "Retour",
      reservation,
    })),
  ];

  return (
    <div className="reservations-view">
      {rows.length === 0 ? (
        <div className="empty-state">
          <p>Aucun départ ou retour prévu aujourd'hui.</p>
        </div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Client</th>
              <th>Voiture</th>
              <th>Date</th>
              <th>Statut réservation</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.type}-${row.reservation._id}`}>
                <td>{row.type}</td>
                <td>
                  {row.reservation.user
                    ? `${row.reservation.user.firstName || ""} ${row.reservation.user.lastName || ""}`.trim() || "Client inconnu"
                    : "Client supprimé"}
                </td>
                <td>
                  {row.reservation.car
                    ? `${row.reservation.car.brand || ""} ${row.reservation.car.model || ""}`.trim() || "Voiture inconnue"
                    : "Voiture supprimée"}
                </td>
                <td>
                  {new Date(
                    row.type === "Départ" ? row.reservation.startDate : row.reservation.endDate
                  ).toLocaleDateString("fr-FR")}
                </td>
                <td>
                  <span className={`status-badge ${String(row.reservation.status || "").toLowerCase()}`}>
                    {(() => {
                      const map = {
                        PENDING: "En attente",
                        CONFIRMED: "Confirmée",
                        ACTIVE: "En cours",
                        COMPLETED: "Terminée",
                        CANCELLED: "Annulée",
                      };
                      const st = String(row.reservation.status || "").toUpperCase();
                      return map[st] || row.reservation.status;
                    })()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function FleetCategoriesView({ cars = [] }) {
  // Only allow CITADINE, BREAK, BERLINE
  const allowedCategories = ["CITADINE", "BREAK", "BERLINE"];
  const counts = cars.reduce((accumulator, car) => {
    const key = car.category || "NON_CLASSÉ";
    if (allowedCategories.includes(key)) {
      accumulator[key] = (accumulator[key] || 0) + 1;
    }
    return accumulator;
  }, {});

  const rows = Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="reservations-view">
      {rows.length === 0 ? (
        <div className="empty-state">
          <p>Aucune catégorie de véhicule disponible.</p>
        </div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Catégorie</th>
              <th>Nombre de véhicules</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([category, count]) => (
              <tr key={category}>
                <td>{category}</td>
                <td>{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function resolveMaybeUploadUrl(url) {
  if (!url || typeof url !== "string") return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) return url;
  if (url.startsWith("/uploads/")) {
    const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
    return `${base}${url}`;
  }
  return url;
}

function KycStatusPill({ status }) {
  const normalized = String(status || "MISSING").toUpperCase();
  const labelMap = {
    MISSING: "Manquant",
    PENDING: "En attente",
    APPROVED: "Validé",
    REJECTED: "Refusé",
  };
  return (
    <span className={`kyc-pill kyc-pill-${normalized.toLowerCase()}`}>
      {labelMap[normalized] || normalized}
    </span>
  );
}

function Icon({ children }) {
  return (
    <span className="admin-icon" aria-hidden="true">
      {children}
    </span>
  );
}

function IdCardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 7.5C4 6.12 5.12 5 6.5 5h11C18.88 5 20 6.12 20 7.5v9c0 1.38-1.12 2.5-2.5 2.5h-11C5.12 19 4 17.88 4 16.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M8 10h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 13h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M15.8 15.2a2.1 2.1 0 1 0-3.6 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HomeDocIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M3.5 10.5 12 4l8.5 6.5V20a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 20v-9.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M9 21v-7h6v7" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function UserPhotoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M20 20a8 8 0 1 0-16 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SelfieIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M7 7h6l1-2h3a2 2 0 0 1 2 2v11a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V9a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M12 17a3.2 3.2 0 1 0-3.2-3.2A3.2 3.2 0 0 0 12 17Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M17.5 10.5h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function DocumentPreviewModal({ open, title, url, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  const isPdf = String(url || "").toLowerCase().includes(".pdf");
  return (
    <div
      className="admin-modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="admin-modal" role="dialog" aria-modal="true">
        <div className="admin-modal-top">
          <div className="admin-modal-title">{title}</div>
          <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>
        <div className="admin-modal-body">
          {isPdf ? (
            <iframe title={title} src={url} className="admin-modal-frame" />
          ) : (
            <img src={url} alt={title} className="admin-modal-image" />
          )}
        </div>
      </div>
    </div>
  );
}

function ClientDocumentsView({ users = [], token, onRefresh }) {
  const [draftReasons, setDraftReasons] = useState({});
  const [savingKey, setSavingKey] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [docTypeFilter, setDocTypeFilter] = useState("any");
  const [preview, setPreview] = useState(null);

  const getDoc = (user, docType) => user?.kyc?.[docType] || {};
  const docUrl = (user, docType) => getDoc(user, docType).url || user?.[docType] || "";
  const docStatus = (user, docType) => getDoc(user, docType).status || (docUrl(user, docType) ? "PENDING" : "MISSING");
  const docReason = (user, docType) => getDoc(user, docType).rejectedReason || "";

  const docTypes = ["profilePhoto", "driverLicensePhoto", "selfieWithLicense", "proofOfResidence"];
  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchesQuery = (u) => {
      if (!q) return true;
      const name = `${u.firstName || ""} ${u.lastName || ""}`.trim().toLowerCase();
      const email = String(u.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    };

    const matchStatus = (u) => {
      if (!statusFilter || statusFilter === "ALL") return true;
      const target = String(statusFilter).toUpperCase();
      if (docTypeFilter !== "any") {
        return docStatus(u, docTypeFilter) === target;
      }
      return docTypes.some((t) => docStatus(u, t) === target);
    };

    return users.filter((u) => matchesQuery(u) && matchStatus(u));
  }, [docTypeFilter, query, statusFilter, users]);

  const handleApprove = async (userId, docType) => {
    if (!token) return;
    const key = `${userId}:${docType}`;
    setSavingKey(key);
    try {
      await reviewUserDocument(token, userId, docType, { status: "APPROVED" });
      onRefresh?.();
    } finally {
      setSavingKey(null);
    }
  };

  const handleReject = async (userId, docType) => {
    if (!token) return;
    const key = `${userId}:${docType}`;
    const reason = String(draftReasons[key] || "").trim();
    if (reason.length < 3) {
      alert("Merci de renseigner une raison de refus (min. 3 caractères).");
      return;
    }
    setSavingKey(key);
    try {
      await reviewUserDocument(token, userId, docType, { status: "REJECTED", rejectedReason: reason });
      onRefresh?.();
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="users-view">
      <div className="kyc-filterbar">
        <div className="kyc-filter-controls">
          <input
            className="kyc-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un client (nom / email)…"
          />

          <select className="kyc-select" value={docTypeFilter} onChange={(e) => setDocTypeFilter(e.target.value)}>
            <option value="any">Tous les documents</option>
            <option value="profilePhoto">Photo profil</option>
            <option value="driverLicensePhoto">Photo permis</option>
            <option value="selfieWithLicense">Selfie + permis</option>
            <option value="proofOfResidence">Justificatif domicile</option>
          </select>

          <select className="kyc-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">Tous statuts</option>
            <option value="PENDING">En attente</option>
            <option value="APPROVED">Validé</option>
            <option value="REJECTED">Refusé</option>
            <option value="MISSING">Manquant</option>
          </select>
        </div>
        <div className="kyc-filter-count">
          {filteredUsers.length} client{filteredUsers.length > 1 ? "s" : ""}
        </div>
      </div>

      <DocumentPreviewModal
        open={Boolean(preview?.url)}
        title={preview?.title || "Document"}
        url={preview?.url || ""}
        onClose={() => setPreview(null)}
      />

      {filteredUsers.length === 0 ? (
        <div className="empty-state">
          <p>
            Aucun résultat.
          </p>
        </div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>
                <span className="kyc-th">
                  <Icon><UserPhotoIcon /></Icon> Photo profil
                </span>
              </th>
              <th>
                <span className="kyc-th">
                  <Icon><IdCardIcon /></Icon> Photo permis
                </span>
              </th>
              <th>
                <span className="kyc-th">
                  <Icon><SelfieIcon /></Icon> Selfie + permis
                </span>
              </th>
              <th>
                <span className="kyc-th">
                  <Icon><HomeDocIcon /></Icon> Justificatif domicile
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((currentUser) => (
              <tr key={currentUser._id}>
                <td>{`${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() || currentUser.email}</td>
                {docTypes.map((docType) => {
                  const url = docUrl(currentUser, docType);
                  const status = docStatus(currentUser, docType);
                  const reason = docReason(currentUser, docType);
                  const key = `${currentUser._id}:${docType}`;
                  const previewUrl = resolveMaybeUploadUrl(url);
                  const isSaving = savingKey === key;

                  return (
                    <td key={docType} className="kyc-cell">
                      <div className="kyc-cell-top">
                        <KycStatusPill status={status} />
                        {previewUrl ? (
                          <button
                            type="button"
                            className="kyc-preview-link"
                            onClick={() =>
                              setPreview({
                                title: `${(currentUser.firstName || "").trim()} ${(currentUser.lastName || "").trim()} — ${docType}`,
                                url: previewUrl,
                              })
                            }
                          >
                            Voir
                          </button>
                        ) : (
                          <span className="kyc-preview-missing">—</span>
                        )}
                      </div>

                      {status === "REJECTED" && reason ? (
                        <div className="kyc-reason">Raison: {reason}</div>
                      ) : null}

                      <div className="kyc-actions">
                        <button
                          type="button"
                          className="kyc-approve"
                          disabled={!previewUrl || isSaving}
                          onClick={() => handleApprove(currentUser._id, docType)}
                        >
                          Valider
                        </button>
                        <button
                          type="button"
                          className="kyc-reject"
                          disabled={!previewUrl || isSaving}
                          onClick={() => handleReject(currentUser._id, docType)}
                        >
                          Refuser
                        </button>
                      </div>

                      <input
                        className="kyc-reason-input"
                        placeholder="Raison de refus (ex: photo floue)"
                        value={draftReasons[key] || ""}
                        onChange={(e) => setDraftReasons((prev) => ({ ...prev, [key]: e.target.value }))}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function FinancePeriodFilterBar({ financeFilters, onChangeFinanceFilters }) {
  return (
    <div className="filter-bar maintenance-filter-bar fleetee-filter-bar" style={{ marginBottom: "1rem" }}>
      <label>
        Année
        <input
          type="number"
          min="2020"
          max="2100"
          value={financeFilters.year}
          onChange={(event) =>
            onChangeFinanceFilters((previous) => ({
              ...previous,
              year: event.target.value,
            }))
          }
        />
      </label>

      <label>
        Mois
        <select
          value={financeFilters.month}
          onChange={(event) =>
            onChangeFinanceFilters((previous) => ({
              ...previous,
              month: event.target.value,
            }))
          }
        >
          <option value="">Toute l'année</option>
          <option value="1">Janvier</option>
          <option value="2">Février</option>
          <option value="3">Mars</option>
          <option value="4">Avril</option>
          <option value="5">Mai</option>
          <option value="6">Juin</option>
          <option value="7">Juillet</option>
          <option value="8">Août</option>
          <option value="9">Septembre</option>
          <option value="10">Octobre</option>
          <option value="11">Novembre</option>
          <option value="12">Décembre</option>
        </select>
      </label>
    </div>
  );
}

function FinanceProfitabilityView({
  profitability,
  onUpdateInvestment,
  financeFilters,
  onChangeFinanceFilters,
}) {
  const totals = profitability?.totals || {};
  const vehicles = Array.isArray(profitability?.vehicles) ? profitability.vehicles : [];
  const [drafts, setDrafts] = useState({});
  const [savingCarId, setSavingCarId] = useState(null);

  useEffect(() => {
    const nextDrafts = {};
    vehicles.forEach((vehicle) => {
      nextDrafts[vehicle.carId] = {
        purchasePrice: String(vehicle.purchasePrice || 0),
        registrationCost: String(vehicle.registrationCost || 0),
        initialOtherCosts: String(vehicle.initialOtherCosts || 0),
      };
    });
    setDrafts(nextDrafts);
  }, [vehicles]);

  const topVehicles = [...vehicles]
    .sort((left, right) => (right.netProfit || 0) - (left.netProfit || 0))
    .slice(0, 5);

  async function handleSave(vehicle) {
    const draft = drafts[vehicle.carId];
    if (!draft) {
      return;
    }

    setSavingCarId(vehicle.carId);
    try {
      await onUpdateInvestment(vehicle.carId, {
        purchasePrice: Number(draft.purchasePrice || 0),
        registrationCost: Number(draft.registrationCost || 0),
        initialOtherCosts: Number(draft.initialOtherCosts || 0),
      });
    } catch (err) {
      alert(err.message || "Impossible de sauvegarder l'investissement");
    } finally {
      setSavingCarId(null);
    }
  }

  return (
    <div className="dashboard-view">
      <FinancePeriodFilterBar
        financeFilters={financeFilters}
        onChangeFinanceFilters={onChangeFinanceFilters}
      />

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Investissement total</h3>
          <p className="stat-number">{formatCurrency(totals.investmentTotal || 0)}</p>
        </div>
        <div className="stat-card">
          <h3>Revenus totaux</h3>
          <p className="stat-number">{formatCurrency(totals.revenueTotal || 0)}</p>
        </div>
        <div className="stat-card">
          <h3>Charges totales</h3>
          <p className="stat-number">{formatCurrency(totals.chargesTotal || 0)}</p>
        </div>
        <div className="stat-card">
          <h3>Bénéfice net global</h3>
          <p className="stat-number">{formatCurrency(totals.netProfit || 0)}</p>
        </div>
      </div>

      <div className="recent-reservations">
        <h2>Rentabilité par véhicule</h2>
        {vehicles.length === 0 ? (
          <div className="empty-state">
            <p>Aucun véhicule à analyser.</p>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Véhicule</th>
                <th>Plaque</th>
                <th>Prix d'achat</th>
                <th>Carte grise</th>
                <th>Autres frais initiaux</th>
                <th>Investissement initial</th>
                <th>Revenus</th>
                <th>Charges</th>
                <th>Bénéfice net</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle) => {
                const draft = drafts[vehicle.carId] || {
                  purchasePrice: "0",
                  registrationCost: "0",
                  initialOtherCosts: "0",
                };

                return (
                  <tr key={vehicle.carId}>
                    <td>{vehicle.brand} {vehicle.model}</td>
                    <td>{vehicle.licensePlate}</td>
                    <td>
                      <input
                        className="admin-input"
                        type="number"
                        min="0"
                        value={draft.purchasePrice}
                        onChange={(event) =>
                          setDrafts((previous) => ({
                            ...previous,
                            [vehicle.carId]: {
                              ...draft,
                              purchasePrice: event.target.value,
                            },
                          }))
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="admin-input"
                        type="number"
                        min="0"
                        value={draft.registrationCost}
                        onChange={(event) =>
                          setDrafts((previous) => ({
                            ...previous,
                            [vehicle.carId]: {
                              ...draft,
                              registrationCost: event.target.value,
                            },
                          }))
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="admin-input"
                        type="number"
                        min="0"
                        value={draft.initialOtherCosts}
                        onChange={(event) =>
                          setDrafts((previous) => ({
                            ...previous,
                            [vehicle.carId]: {
                              ...draft,
                              initialOtherCosts: event.target.value,
                            },
                          }))
                        }
                      />
                    </td>
                    <td>{formatCurrency(vehicle.initialInvestment || 0)}</td>
                    <td>{formatCurrency(vehicle.revenue || 0)}</td>
                    <td>
                      {formatCurrency(vehicle.chargesTotal || 0)}
                      <br />
                      <small>
                        Entretien: {formatCurrency(vehicle.maintenanceCharges || 0)}
                      </small>
                    </td>
                    <td>
                      <span className={(vehicle.netProfit || 0) >= 0 ? "badge-active" : "badge-inactive"}>
                        {formatCurrency(vehicle.netProfit || 0)}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn-approve"
                        type="button"
                        disabled={savingCarId === vehicle.carId}
                        onClick={() => handleSave(vehicle)}
                      >
                        {savingCarId === vehicle.carId ? "Sauvegarde..." : "Sauvegarder"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="recent-reservations">
        <h2>Top véhicules (bénéfice net)</h2>
        {topVehicles.length === 0 ? (
          <div className="empty-state">
            <p>Aucune donnée disponible.</p>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Véhicule</th>
                <th>Plaque</th>
                <th>Revenus</th>
                <th>Charges</th>
                <th>Bénéfice net</th>
              </tr>
            </thead>
            <tbody>
              {topVehicles.map((vehicle) => (
                <tr key={`top-${vehicle.carId}`}>
                  <td>{vehicle.brand} {vehicle.model}</td>
                  <td>{vehicle.licensePlate}</td>
                  <td>{formatCurrency(vehicle.revenue || 0)}</td>
                  <td>{formatCurrency(vehicle.chargesTotal || 0)}</td>
                  <td>{formatCurrency(vehicle.netProfit || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function FinanceChargesView({
  cars = [],
  charges = [],
  onCreateCharge,
  onDeleteCharge,
  financeFilters,
  onChangeFinanceFilters,
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formData, setFormData] = useState({
    carId: "",
    category: "ENTRETIEN",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    frequency: "PONCTUELLE",
    description: "",
  });

  const fixedMonthlyTotal = useMemo(() => {
    return charges
      .filter((c) => String(c.frequency || "").toUpperCase() === "MENSUELLE")
      .reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
  }, [charges]);

  const totals = charges.reduce(
    (accumulator, charge) => {
      accumulator.base += Number(charge.amount) || 0;
      accumulator.computed += Number(charge.computedTotal) || 0;
      return accumulator;
    },
    { base: 0, computed: 0 }
  );

  async function upsertFixedCharge(carId, category, amount, label) {
    if (!carId) {
      alert("Choisis un véhicule.");
      return;
    }
    const a = Number(amount);
    if (!Number.isFinite(a) || a <= 0) {
      alert("Montant invalide.");
      return;
    }
    await onCreateCharge({
      carId,
      category,
      amount: a,
      date: new Date().toISOString().slice(0, 10),
      frequency: "MENSUELLE",
      description: label,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!formData.carId || !formData.amount || !formData.date) {
      alert("Veuillez renseigner véhicule, montant et date.");
      return;
    }

    try {
      await onCreateCharge({
        carId: formData.carId,
        category: formData.category,
        amount: Number(formData.amount),
        date: formData.date,
        frequency: formData.frequency,
        description: formData.description,
      });

      setFormData({
        carId: "",
        category: "ENTRETIEN",
        amount: "",
        date: new Date().toISOString().slice(0, 10),
        frequency: "PONCTUELLE",
        description: "",
      });
      setDrawerOpen(false);
    } catch (err) {
      alert(err.message || "Impossible d'ajouter la charge");
    }
  }

  async function handleDelete(chargeId) {
    if (!window.confirm("Supprimer cette charge ?")) {
      return;
    }

    try {
      await onDeleteCharge(chargeId);
    } catch (err) {
      alert(err.message || "Impossible de supprimer la charge");
    }
  }

  return (
    <div className="maintenance-view fleetee-maintenance">
      <FinancePeriodFilterBar
        financeFilters={financeFilters}
        onChangeFinanceFilters={onChangeFinanceFilters}
      />

      <section className="maintenance-topbar">
        <div>
          <h2>Charges du parc</h2>
          <p className="maintenance-topbar-subtitle">
            Dépenses ponctuelles, mensuelles et charges opérationnelles par véhicule
          </p>
        </div>
        <button className="btn-approve maintenance-add-btn" type="button" onClick={() => setDrawerOpen(true)}>
          + Ajouter une charge
        </button>
      </section>

      <section className="maintenance-kpi-grid">
        <article className="maintenance-kpi-card">
          <p>Nombre de charges</p>
          <strong>{charges.length}</strong>
        </article>
        <article className="maintenance-kpi-card">
          <p>Montant saisi</p>
          <strong>{formatCurrency(totals.base)}</strong>
        </article>
        <article className="maintenance-kpi-card">
          <p>Impact calculé</p>
          <strong>{formatCurrency(totals.computed)}</strong>
        </article>
        <article className="maintenance-kpi-card">
          <p>Frais fixes mensuels (total)</p>
          <strong>{formatCurrency(fixedMonthlyTotal)}</strong>
        </article>
      </section>

      <section className="maintenance-panel" style={{ marginTop: 10 }}>
        <div className="maintenance-panel-header" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h3 style={{ margin: 0 }}>Frais fixes (leasing / assurance / parking)</h3>
            <p className="maintenance-topbar-subtitle" style={{ marginTop: 6 }}>
              Ajoute rapidement les charges récurrentes mensuelles par véhicule.
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <div className="form-row">
            <div className="form-group">
              <label>Véhicule</label>
              <select
                value={formData.carId}
                onChange={(event) => setFormData((previous) => ({ ...previous, carId: event.target.value }))}
              >
                <option value="">Sélectionner un véhicule</option>
                {cars.map((car) => (
                  <option key={car._id} value={car._id}>
                    {car.brand} {car.model} ({car.licensePlate})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Leasing mensuel (€)</label>
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Ex: 450"
                  value={formData.__leasing || ""}
                  onChange={(e) => setFormData((p) => ({ ...p, __leasing: e.target.value }))}
                />
                <button
                  type="button"
                  className="btn-approve"
                  onClick={() => upsertFixedCharge(formData.carId, "LEASING", formData.__leasing, "Leasing mensuel")}
                >
                  Ajouter
                </button>
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Assurance mensuelle (€)</label>
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Ex: 120"
                  value={formData.__insurance || ""}
                  onChange={(e) => setFormData((p) => ({ ...p, __insurance: e.target.value }))}
                />
                <button
                  type="button"
                  className="btn-approve"
                  onClick={() => upsertFixedCharge(formData.carId, "ASSURANCE", formData.__insurance, "Assurance mensuelle")}
                >
                  Ajouter
                </button>
              </div>
            </div>
            <div className="form-group">
              <label>Parking fixe (€)</label>
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Ex: 80"
                  value={formData.__parking || ""}
                  onChange={(e) => setFormData((p) => ({ ...p, __parking: e.target.value }))}
                />
                <button
                  type="button"
                  className="btn-approve"
                  onClick={() => upsertFixedCharge(formData.carId, "PARKING_FIXE", formData.__parking, "Parking fixe")}
                >
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="maintenance-panel">
        {charges.length === 0 ? (
          <div className="empty-state">
            <p>Aucune charge enregistrée.</p>
          </div>
        ) : (
          <div className="maintenance-table-wrapper">
            <table className="admin-table maintenance-table-premium">
              <thead>
                <tr>
                  <th>Véhicule</th>
                  <th>Catégorie</th>
                  <th>Date</th>
                  <th>Fréquence</th>
                  <th>Montant</th>
                  <th>Impact calculé</th>
                  <th>Détails</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {charges.map((charge) => (
                  <tr key={charge._id}>
                    <td>
                      {charge.car
                        ? `${charge.car.brand} ${charge.car.model} (${charge.car.licensePlate})`
                        : "Voiture supprimée"}
                    </td>
                    <td>{formatFinanceChargeCategory(charge.category)}</td>
                    <td>{new Date(charge.date).toLocaleDateString("fr-FR")}</td>
                    <td>{charge.frequency === "MENSUELLE" ? "Mensuelle" : "Ponctuelle"}</td>
                    <td>{formatCurrency(charge.amount)}</td>
                    <td>{formatCurrency(charge.computedTotal || charge.amount || 0)}</td>
                    <td>{charge.description || "-"}</td>
                    <td>
                      <button className="btn-reject" type="button" onClick={() => handleDelete(charge._id)}>
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {drawerOpen && (
        <>
          <div className="vehicle-file-overlay" onClick={() => setDrawerOpen(false)} />
          <aside className="maintenance-drawer" role="dialog" aria-modal="true">
            <div className="maintenance-drawer-header">
              <h3>Ajouter une charge</h3>
              <button className="vehicle-file-close" onClick={() => setDrawerOpen(false)}>
                ×
              </button>
            </div>

            <form className="maintenance-form maintenance-drawer-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Véhicule *</label>
                <select
                  value={formData.carId}
                  onChange={(event) => setFormData((previous) => ({ ...previous, carId: event.target.value }))}
                  required
                >
                  <option value="">Sélectionner un véhicule</option>
                  {cars.map((car) => (
                    <option key={car._id} value={car._id}>
                      {car.brand} {car.model} ({car.licensePlate})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Type de charge</label>
                  <select
                    value={formData.category}
                    onChange={(event) => setFormData((previous) => ({ ...previous, category: event.target.value }))}
                  >
                    <option value="ENTRETIEN">Entretien</option>
                    <option value="REPARATION">Réparation</option>
                    <option value="PNEUS">Pneus</option>
                    <option value="CONTROLE_TECHNIQUE">Contrôle technique</option>
                    <option value="ASSURANCE">Assurance</option>
                    <option value="LEASING">Leasing</option>
                    <option value="PARKING_MENSUEL">Parking mensuel</option>
                    <option value="PARKING_FIXE">Parking (fixe)</option>
                    <option value="BOITIER_TELEMATIQUE">Boîtier / télématique</option>
                    <option value="AUTRE">Autre</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Fréquence</label>
                  <select
                    value={formData.frequency}
                    onChange={(event) => setFormData((previous) => ({ ...previous, frequency: event.target.value }))}
                  >
                    <option value="PONCTUELLE">Ponctuelle</option>
                    <option value="MENSUELLE">Mensuelle</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Date *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(event) => setFormData((previous) => ({ ...previous, date: event.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Montant (€) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={(event) => setFormData((previous) => ({ ...previous, amount: event.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description / Détails</label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(event) => setFormData((previous) => ({ ...previous, description: event.target.value }))}
                />
              </div>

              <div className="maintenance-drawer-actions">
                <button type="button" className="btn-deactivate" onClick={() => setDrawerOpen(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn-approve">
                  Enregistrer
                </button>
              </div>
            </form>
          </aside>
        </>
      )}
    </div>
  );
}

function FinanceSummaryView({ summary, revenueSeries, revenueSeriesPrev, cars = [], financeFilters, onChangeFinanceFilters }) {
  if (!summary) {
    return (
      <div className="empty-state">
        <p>Chargement du résumé financier...</p>
      </div>
    );
  }

  const totals = summary.totals || {};
  const points = Array.isArray(revenueSeries?.points) ? revenueSeries.points : [];
  const prevPoints = Array.isArray(revenueSeriesPrev?.points) ? revenueSeriesPrev.points : [];
  const maxRevenue = Math.max(1, ...points.map((p) => Number(p.revenue || 0)));
  const currentPaidRevenue = points.reduce((acc, p) => acc + (Number(p.revenue || 0) || 0), 0);
  const prevPaidRevenue = prevPoints.reduce((acc, p) => acc + (Number(p.revenue || 0) || 0), 0);
  const deltaPct = prevPaidRevenue > 0 ? ((currentPaidRevenue - prevPaidRevenue) / prevPaidRevenue) * 100 : null;
  const [chartView, setChartView] = useState("CA_BAR"); // CA_BAR | CA_LINE | CHARGES_PIE

  function downloadCsv() {
    const rows = [
      ["date", "revenue", "reservationsCount"],
      ...points.map((p) => [
        p.date ? new Date(p.date).toISOString() : "",
        Number(p.revenue || 0),
        Number(p.count || 0),
      ]),
    ];
    const escape = (v) => {
      const s = v === null || v === undefined ? "" : String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const csv = rows.map((r) => r.map(escape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ionykar-ca.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const distributionTotal = Math.max(1, totals.revenueTotal || 0);
  const distribution = [
    { label: "Investissement", value: totals.investmentTotal || 0, color: "#2563eb" },
    { label: "Charges opérationnelles", value: (totals.chargesTotal || 0) - (totals.investmentTotal || 0), color: "#dc2626" },
    { label: "Bénéfice net", value: Math.max(0, totals.netProfit || 0), color: "#16a34a" },
  ];

  const caLabels = points.map((p) => {
    if (!p.date) return "";
    const d = new Date(p.date);
    const monthSelected = Boolean(financeFilters?.month);
    return monthSelected
      ? d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })
      : d.toLocaleDateString("fr-FR", { month: "short" });
  });
  const caValues = points.map((p) => Number(p.revenue || 0));

  const chartCommonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
    scales: {
      x: { ticks: { color: "#0e0e0e", font: { weight: "700" } }, grid: { display: false } },
      y: { ticks: { color: "#0e0e0e", font: { weight: "700" } }, grid: { color: "rgba(14,14,14,0.08)" } },
    },
  };

  const chargesPieItems = Array.isArray(summary.manualChargesByCategory)
    ? summary.manualChargesByCategory
        .map((i) => ({
          label: formatFinanceChargeCategory(i.category),
          value: Number(i.totalAmountComputed || 0),
        }))
        .filter((x) => x.value > 0)
    : [];

  const chargesPieData = {
    labels: chargesPieItems.map((i) => i.label),
    datasets: [
      {
        data: chargesPieItems.map((i) => i.value),
        backgroundColor: ["#0e0e0e", "#fcbe0c", "#64748b", "#ef4444", "#22c55e", "#3b82f6", "#a855f7"],
        borderColor: "rgba(14,14,14,0.08)",
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="dashboard-view">
      <FinancePeriodFilterBar
        financeFilters={financeFilters}
        onChangeFinanceFilters={onChangeFinanceFilters}
      />

      <div className="filter-bar maintenance-filter-bar fleetee-filter-bar" style={{ marginTop: -18, marginBottom: 0 }}>
        <label>
          Véhicule
          <select
            value={financeFilters?.carId || ""}
            onChange={(e) =>
              onChangeFinanceFilters((prev) => ({
                ...prev,
                carId: e.target.value,
              }))
            }
          >
            <option value="">Tous les véhicules</option>
            {cars.map((car) => (
              <option key={car._id} value={car._id}>
                {car.brand} {car.model} ({car.licensePlate})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Investissement total</h3>
          <p className="stat-number">{formatCurrency(totals.investmentTotal || 0)}</p>
        </div>
        <div className="stat-card">
          <h3>Chiffre d'affaires total</h3>
          <p className="stat-number">{formatCurrency(totals.revenueTotal || 0)}</p>
        </div>
        <div className="stat-card">
          <h3>CA encaissé (période)</h3>
          <p className="stat-number">{formatCurrency(currentPaidRevenue || 0)}</p>
        </div>
        <div className="stat-card">
          <h3>N-1 (comparaison)</h3>
          <p className="stat-number">
            {deltaPct === null ? "—" : `${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(1)}%`}
          </p>
        </div>
      </div>

      <div className="recent-reservations" style={{ marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h2 style={{ margin: 0 }}>
              {chartView === "CHARGES_PIE" ? "Répartition des charges (période)" : "Évolution du CA (encaissé)"}
            </h2>
            <select
              value={chartView}
              onChange={(e) => setChartView(e.target.value)}
              style={{ height: 38, borderRadius: 12, border: "1px solid #e5e7eb", padding: "0 12px", fontWeight: 900 }}
            >
              <option value="CA_BAR">Graphique CA — Barres</option>
              <option value="CA_LINE">Graphique CA — Courbe</option>
              <option value="CHARGES_PIE">Graphique Charges — Camembert</option>
            </select>
          </div>
          <button type="button" className="btn-approve" onClick={downloadCsv}>
            Export CSV / Excel
          </button>
        </div>
        <div className="finance-chart-canvas">
          {(() => {
            if (chartView === "CHARGES_PIE") {
              if (chargesPieItems.length === 0) {
                return (
                  <div className="empty-state" style={{ margin: 0 }}>
                    <p>Aucune charge à afficher sur la période.</p>
                  </div>
                );
              }
              return (
                <Doughnut
                  data={chargesPieData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: true, labels: { color: "#0e0e0e", font: { weight: "700" } } },
                    },
                  }}
                />
              );
            }

            if (points.length === 0) {
              return (
                <div className="empty-state" style={{ margin: 0 }}>
                  <p>Aucune donnée de CA sur la période (uniquement les réservations payées).</p>
                </div>
              );
            }

            if (chartView === "CA_LINE") {
              return (
                <Line
                  data={{
                    labels: caLabels,
                    datasets: [
                      {
                        label: "CA encaissé",
                        data: caValues,
                        borderColor: "#0e0e0e",
                        backgroundColor: "rgba(252,190,12,0.35)",
                        tension: 0.35,
                        pointRadius: 2,
                      },
                    ],
                  }}
                  options={chartCommonOptions}
                />
              );
            }

            return (
              <Bar
                data={{
                  labels: caLabels,
                  datasets: [
                    {
                      label: "CA encaissé",
                      data: caValues,
                      backgroundColor: "rgba(252,190,12,0.85)",
                      borderColor: "rgba(14,14,14,0.18)",
                      borderWidth: 1,
                      borderRadius: 10,
                      barThickness: 22,
                    },
                  ],
                }}
                options={{
                  ...chartCommonOptions,
                  plugins: { ...chartCommonOptions.plugins, legend: { display: false } },
                }}
              />
            );
          })()}
        </div>
      </div>

      <div className="recent-reservations">
        <h2>Vue globale du parc</h2>
        <p style={{ marginBottom: "1rem" }}>
          {summary.vehiclesCount || 0} véhicules, {summary.profitableVehicles || 0} rentables, {summary.lossMakingVehicles || 0} en perte.
        </p>
        {summary.period && (
          <p style={{ marginBottom: "1rem" }}>
            Période: {summary.period.month ? `${String(summary.period.month).padStart(2, "0")}/` : ""}{summary.period.year}
          </p>
        )}

        <div style={{ display: "grid", gap: "0.8rem" }}>
          {distribution.map((item) => {
            const percent = Math.min(100, Math.max(0, (item.value / distributionTotal) * 100));
            return (
              <div key={item.label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                  <strong>{item.label}</strong>
                  <span>{formatCurrency(item.value)}</span>
                </div>
                <div style={{ width: "100%", background: "#e5e7eb", borderRadius: "999px", height: "12px" }}>
                  <div
                    style={{
                      width: `${percent}%`,
                      background: item.color,
                      borderRadius: "999px",
                      height: "100%",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="recent-reservations">
        <h2>Charges manuelles par catégorie</h2>
        {!Array.isArray(summary.manualChargesByCategory) || summary.manualChargesByCategory.length === 0 ? (
          <div className="empty-state">
            <p>Aucune charge manuelle enregistrée.</p>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Catégorie</th>
                <th>Nombre</th>
                <th>Montant de base cumulé</th>
                <th>Impact calculé période</th>
              </tr>
            </thead>
            <tbody>
              {summary.manualChargesByCategory.map((item) => (
                <tr key={item.category}>
                  <td>{formatFinanceChargeCategory(item.category)}</td>
                  <td>{item.count}</td>
                  <td>{formatCurrency(item.totalAmountBase || 0)}</td>
                  <td>{formatCurrency(item.totalAmountComputed || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function formatFinanceChargeCategory(category) {
  const labels = {
    ENTRETIEN: "Entretien",
    REPARATION: "Réparation",
    PNEUS: "Pneus",
    CONTROLE_TECHNIQUE: "Contrôle technique",
    ASSURANCE: "Assurance",
    PARKING_MENSUEL: "Parking mensuel",
    PARKING_FIXE: "Parking (fixe)",
    LEASING: "Leasing",
    BOITIER_TELEMATIQUE: "Boîtier / télématique",
    AUTRE: "Autre",
  };

  return labels[category] || category;
}

// Dashboard Stats
function DashboardView({ stats }) {
  if (!stats || !stats.reservations) {
    return <div className="empty-state"><p>Chargement des statistiques...</p></div>;
  }
  
  const byStatus = Array.isArray(stats.reservations.byStatus)
    ? stats.reservations.byStatus
    : [];
  const recentReservations = Array.isArray(stats.recent) ? stats.recent : [];
  const pending = byStatus.find((s) => s?._id === "PENDING");
  const confirmed = byStatus.find((s) => s?._id === "CONFIRMED");
  const statusLabel = (status) => {
    const map = {
      PENDING: "En attente",
      CONFIRMED: "Confirmée",
      ACTIVE: "En cours",
      COMPLETED: "Terminée",
      CANCELLED: "Annulée",
    };
    return map[String(status || "").toUpperCase()] || String(status || "—");
  };

  return (
    <div className="dashboard-view">
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Réservations en attente</h3>
          <p className="stat-number">{pending?.count || 0}</p>
        </div>
        
        <div className="stat-card">
          <h3>Réservations confirmées</h3>
          <p className="stat-number">{confirmed?.count || 0}</p>
        </div>

        <div className="stat-card">
          <h3>Départs aujourd'hui</h3>
          <p className="stat-number">{stats.reservations.todayPickups}</p>
        </div>

        <div className="stat-card">
          <h3>Retours aujourd'hui</h3>
          <p className="stat-number">{stats.reservations.todayReturns}</p>
        </div>

        <div className="stat-card">
          <h3>Total utilisateurs</h3>
          <p className="stat-number">{stats.users.total}</p>
          <p className="stat-detail">
            {stats.users.active} avec compte, {stats.users.guests} invités
          </p>
        </div>

        <div className="stat-card">
          <h3>Voitures</h3>
          <p className="stat-number">{stats.cars.total}</p>
          <p className="stat-detail">{stats.cars.available} disponibles</p>
        </div>

        <div className="stat-card">
          <h3>Dépenses entretien {stats.maintenance?.year}</h3>
          <p className="stat-number">{formatCurrency(stats.maintenance?.totalCost || 0)}</p>
          <p className="stat-detail">
            {stats.maintenance?.count || 0} intervention{(stats.maintenance?.count || 0) > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="recent-reservations">
        <h2>Dernières réservations</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Voiture</th>
              <th>Dates</th>
              <th>Statut</th>
              <th>Prix</th>
            </tr>
          </thead>
          <tbody>
            {recentReservations.map((res) => (
              <tr key={res._id}>
                <td>
                  {res.user
                    ? `${res.user.firstName || ""} ${res.user.lastName || ""}`.trim() || "Client inconnu"
                    : "Client supprimé"}
                </td>
                <td>
                  {res.car
                    ? `${res.car.brand || ""} ${res.car.model || ""}`.trim() || "Voiture inconnue"
                    : "Voiture supprimée"}
                </td>
                <td>
                  {new Date(res.startDate).toLocaleDateString()} →{" "}
                  {new Date(res.endDate).toLocaleDateString()}
                </td>
                <td>
                  <span className={`status-badge ${res.status.toLowerCase()}`}>
                    {statusLabel(res.status)}
                  </span>
                </td>
                <td>{res.totalPrice}€</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatCurrency(value) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function formatMaintenanceCategory(category) {
  const labels = {
    REVISION: "Révision",
    VIDANGE: "Vidange",
    PNEUS: "Pneus",
    CARROSSERIE: "Carrosserie",
    PARE_BRISE: "Pare-brise",
    FREINS: "Freins",
    BATTERIE: "Batterie",
    CONTROLE_TECHNIQUE: "Contrôle technique",
    NETTOYAGE: "Nettoyage",
    ASSURANCE: "Assurance",
    AUTRE: "Autre",
  };

  return labels[category] || category;
}

function MaintenanceView({ token, cars = [], initialData }) {
  const currentYear = new Date().getFullYear();
  const [records, setRecords] = useState(initialData?.records || []);
  const [summary, setSummary] = useState(initialData?.summary || null);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filters, setFilters] = useState({
    carId: "",
    category: "",
    year: String(currentYear),
  });
  const [formData, setFormData] = useState({
    carId: "",
    category: "REVISION",
    status: "PLANIFIE",
    date: new Date().toISOString().slice(0, 10),
    durationDays: "1",
    cost: "",
    vendor: "",
    mileage: "",
    notes: "",
  });

  useEffect(() => {
    setRecords(initialData?.records || []);
    setSummary(initialData?.summary || null);
  }, [initialData]);

  async function loadRecords(nextFilters = filters) {
    setLoading(true);
    try {
      const response = await getMaintenanceRecords(token, nextFilters);
      setRecords(response.records || []);
      setSummary(response.summary || null);
    } catch (err) {
      alert(err.message || "Erreur lors du chargement des entretiens");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateRecord(event) {
    event.preventDefault();

    if (!formData.carId || !formData.cost || !formData.date) {
      alert("Veuillez renseigner la voiture, la date et le coût.");
      return;
    }

    try {
      await createMaintenanceRecord(token, {
        ...formData,
        cost: Number(formData.cost),
        durationDays: Number(formData.durationDays || 1),
        mileage: formData.mileage ? Number(formData.mileage) : undefined,
      });
      setFormData((previous) => ({
        ...previous,
        status: "PLANIFIE",
        durationDays: "1",
        cost: "",
        vendor: "",
        mileage: "",
        notes: "",
        date: new Date().toISOString().slice(0, 10),
      }));
      await loadRecords();
      setDrawerOpen(false);
    } catch (err) {
      alert(err.message || "Erreur lors de la création de l'entretien");
    }
  }

  async function handleDeleteRecord(recordId) {
    if (!window.confirm("Supprimer cette dépense d'entretien ?")) {
      return;
    }

    try {
      await deleteMaintenanceRecord(token, recordId);
      await loadRecords();
    } catch (err) {
      alert(err.message || "Erreur lors de la suppression");
    }
  }

  const averageCost = summary?.count
    ? (summary.totalCost || 0) / summary.count
    : 0;

  const plannedCount = records.filter((record) => record.status === "PLANIFIE").length;
  const inProgressCount = records.filter((record) => record.status === "EN_COURS").length;

  return (
    <div className="maintenance-view fleetee-maintenance">
      <section className="maintenance-topbar">
        <div>
          <h2>Liste des interventions</h2>
          <p className="maintenance-topbar-subtitle">
            Suivi opérationnel des interventions et coûts de flotte
          </p>
        </div>
        <button className="btn-approve maintenance-add-btn" type="button" onClick={() => setDrawerOpen(true)}>
          + Ajouter une intervention
        </button>
      </section>

      <section className="maintenance-kpi-grid">
        <article className="maintenance-kpi-card">
          <p>Montant total des réparations</p>
          <strong>{formatCurrency(summary?.totalCost || 0)}</strong>
        </article>
        <article className="maintenance-kpi-card">
          <p>Nombre d'interventions</p>
          <strong>{summary?.count || 0}</strong>
        </article>
        <article className="maintenance-kpi-card">
          <p>Montant moyen</p>
          <strong>{formatCurrency(averageCost)}</strong>
        </article>
        <article className="maintenance-kpi-card">
          <p>Planifiées / en cours</p>
          <strong>{plannedCount} / {inProgressCount}</strong>
        </article>
      </section>

      <section className="maintenance-panel">
        <div className="filter-bar maintenance-filter-bar fleetee-filter-bar">
          <label>
            Année
            <input
              type="number"
              min="2020"
              max="2100"
              value={filters.year}
              onChange={(event) =>
                setFilters((previous) => ({ ...previous, year: event.target.value }))
              }
            />
          </label>

          <label>
            Véhicule
            <select
              value={filters.carId}
              onChange={(event) =>
                setFilters((previous) => ({ ...previous, carId: event.target.value }))
              }
            >
              <option value="">Tous</option>
              {cars.map((car) => (
                <option key={car._id} value={car._id}>
                  {car.brand} {car.model} ({car.licensePlate})
                </option>
              ))}
            </select>
          </label>

          <label>
            Type d'intervention
            <select
              value={filters.category}
              onChange={(event) =>
                setFilters((previous) => ({ ...previous, category: event.target.value }))
              }
            >
              <option value="">Tous</option>
              {[
                "REVISION",
                "VIDANGE",
                "PNEUS",
                "CARROSSERIE",
                "PARE_BRISE",
                "FREINS",
                "BATTERIE",
                "CONTROLE_TECHNIQUE",
                "NETTOYAGE",
                "ASSURANCE",
                "AUTRE",
              ].map((category) => (
                <option key={category} value={category}>
                  {formatMaintenanceCategory(category)}
                </option>
              ))}
            </select>
          </label>

          <button className="btn-active" type="button" onClick={() => loadRecords()}>
            Filtrer
          </button>
        </div>

        {loading ? (
          <p>Chargement des interventions...</p>
        ) : records.length === 0 ? (
          <div className="empty-state">
            <p>🛠️ Aucune intervention enregistrée</p>
          </div>
        ) : (
          <div className="maintenance-table-wrapper">
            <table className="admin-table maintenance-table-premium">
              <thead>
                <tr>
                  <th>Véhicule</th>
                  <th>Plaque</th>
                  <th>Date de l'intervention</th>
                  <th>Type</th>
                  <th>Statut</th>
                  <th>Prestataire</th>
                  <th>Coût</th>
                  <th>Détails</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record._id}>
                    <td>
                      <strong>{record.car?.brand} {record.car?.model}</strong>
                    </td>
                    <td>{record.car?.licensePlate || "-"}</td>
                    <td>
                      {new Date(record.date).toLocaleDateString("fr-FR")}
                      <br />
                      <small>
                        {record.durationDays ? `${record.durationDays} jour${record.durationDays > 1 ? "s" : ""}` : "-"}
                      </small>
                    </td>
                    <td>{formatMaintenanceCategory(record.category)}</td>
                    <td>
                      <span className={`status-badge ${(record.status || "PLANIFIE").toLowerCase()}`}>
                        {record.status === "EN_COURS"
                          ? "En cours"
                          : record.status === "TERMINE"
                          ? "Terminé"
                          : "Planifié"}
                      </span>
                    </td>
                    <td>{record.vendor || "-"}</td>
                    <td>{formatCurrency(record.cost)}</td>
                    <td className="maintenance-note-cell">{record.notes || "-"}</td>
                    <td>
                      <button
                        className="btn-reject"
                        type="button"
                        onClick={() => handleDeleteRecord(record._id)}
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {drawerOpen && (
        <>
          <div className="vehicle-file-overlay" onClick={() => setDrawerOpen(false)} />
          <aside className="maintenance-drawer" role="dialog" aria-modal="true">
            <div className="maintenance-drawer-header">
              <h3>Ajouter une intervention</h3>
              <button className="vehicle-file-close" onClick={() => setDrawerOpen(false)}>
                ×
              </button>
            </div>

            <form className="maintenance-form maintenance-drawer-form" onSubmit={handleCreateRecord}>
              <div className="form-group">
                <label>Véhicule *</label>
                <select
                  value={formData.carId}
                  onChange={(event) =>
                    setFormData((previous) => ({ ...previous, carId: event.target.value }))
                  }
                  required
                >
                  <option value="">Sélectionner un véhicule</option>
                  {cars.map((car) => (
                    <option key={car._id} value={car._id}>
                      {car.brand} {car.model} ({car.licensePlate})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Date d'intervention *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(event) =>
                      setFormData((previous) => ({ ...previous, date: event.target.value }))
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Durée d'immobilisation</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.durationDays}
                    onChange={(event) =>
                      setFormData((previous) => ({ ...previous, durationDays: event.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Type d'intervention</label>
                  <select
                    value={formData.category}
                    onChange={(event) =>
                      setFormData((previous) => ({ ...previous, category: event.target.value }))
                    }
                  >
                    {[
                      "REVISION",
                      "VIDANGE",
                      "PNEUS",
                      "CARROSSERIE",
                      "PARE_BRISE",
                      "FREINS",
                      "BATTERIE",
                      "CONTROLE_TECHNIQUE",
                      "NETTOYAGE",
                      "ASSURANCE",
                      "AUTRE",
                    ].map((category) => (
                      <option key={category} value={category}>
                        {formatMaintenanceCategory(category)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Statut</label>
                  <select
                    value={formData.status}
                    onChange={(event) =>
                      setFormData((previous) => ({ ...previous, status: event.target.value }))
                    }
                  >
                    <option value="PLANIFIE">Planifié</option>
                    <option value="EN_COURS">En cours</option>
                    <option value="TERMINE">Terminé</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Nom du prestataire</label>
                  <input
                    type="text"
                    placeholder="Garage, centre auto..."
                    value={formData.vendor}
                    onChange={(event) =>
                      setFormData((previous) => ({ ...previous, vendor: event.target.value }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Coût (€) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.cost}
                    onChange={(event) =>
                      setFormData((previous) => ({ ...previous, cost: event.target.value }))
                    }
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Kilométrage</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.mileage}
                  onChange={(event) =>
                    setFormData((previous) => ({ ...previous, mileage: event.target.value }))
                  }
                />
              </div>

              <div className="form-group">
                <label>Détails / Description</label>
                <textarea
                  rows={4}
                  placeholder="Ex: remplacement freins avant + contrôle sécurité"
                  value={formData.notes}
                  onChange={(event) =>
                    setFormData((previous) => ({ ...previous, notes: event.target.value }))
                  }
                />
              </div>

              <div className="maintenance-drawer-actions">
                <button type="button" className="btn-deactivate" onClick={() => setDrawerOpen(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn-approve">
                  Enregistrer
                </button>
              </div>
            </form>
          </aside>
        </>
      )}
    </div>
  );
}

// Liste des réservations
function ReservationsView({ reservations = [], onUpdateStatus }) {
  const [filterStatus, setFilterStatus] = useState("");
  const now = new Date();

  const statusLabel = (status) => {
    const map = {
      PENDING: "En attente",
      CONFIRMED: "Confirmée",
      ACTIVE: "En cours",
      COMPLETED: "Terminée",
      CANCELLED: "Annulée",
    };
    return map[String(status || "").toUpperCase()] || String(status || "—");
  };

  function canStartReservation(reservation) {
    if (reservation.status !== "CONFIRMED") {
      return { canStart: false, reason: "La réservation doit être CONFIRMED." };
    }

    const startBoundary = new Date(reservation.startDate);
    startBoundary.setHours(0, 0, 0, 0);

    const endBoundary = new Date(reservation.endDate);
    endBoundary.setHours(23, 59, 59, 999);

    if (now < startBoundary) {
      return { canStart: false, reason: "Impossible de démarrer avant la date de début." };
    }

    if (now > endBoundary) {
      return { canStart: false, reason: "Impossible de démarrer après la date de fin." };
    }

    return { canStart: true, reason: "" };
  }

  const filteredReservations = filterStatus
    ? reservations.filter((r) => r.status === filterStatus)
    : reservations;

  return (
    <div className="reservations-view">
      <div className="filter-bar">
        <label>
          Filtrer par statut:
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Tous</option>
            <option value="PENDING">En attente</option>
            <option value="CONFIRMED">Confirmé</option>
            <option value="ACTIVE">En cours</option>
            <option value="COMPLETED">Terminé</option>
            <option value="CANCELLED">Annulé</option>
          </select>
        </label>
      </div>

      {filteredReservations.length === 0 ? (
        <div className="empty-state">
          <p>📋 Aucune réservation trouvée</p>
        </div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Email</th>
              <th>Téléphone</th>
              <th>Voiture</th>
              <th>Dates</th>
              <th>Statut</th>
              <th>Prix</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredReservations.map((res) => {
              const { canStart, reason } = canStartReservation(res);

              return (
            <tr key={res._id}>
              <td>
                {res.user
                  ? `${res.user.firstName || ""} ${res.user.lastName || ""}`.trim() || "Client inconnu"
                  : "Client supprimé"}
              </td>
              <td>{res.user?.email || "-"}</td>
              <td>{res.user?.phone || "-"}</td>
              <td>
                {res.car
                  ? `${res.car.brand || ""} ${res.car.model || ""}`.trim() || "Voiture inconnue"
                  : "Voiture supprimée"}
                <br />
                <small>{res.car?.licensePlate || "-"}</small>
              </td>
              <td>
                {new Date(res.startDate).toLocaleDateString()}
                <br />→ {new Date(res.endDate).toLocaleDateString()}
              </td>
              <td>
                <span className={`status-badge ${res.status.toLowerCase()}`}>
                  {statusLabel(res.status)}
                </span>
              </td>
              <td>{res.totalPrice}€</td>
              <td className="actions-cell">
                {res.status === "PENDING" && (
                  <>
                    <button
                      className="btn-approve"
                      onClick={() => onUpdateStatus(res._id, "CONFIRMED")}
                    >
                      ✓ Approuver
                    </button>
                    <button
                      className="btn-reject"
                      onClick={() => onUpdateStatus(res._id, "CANCELLED")}
                    >
                      ✗ Refuser
                    </button>
                  </>
                )}
                {res.status === "CONFIRMED" && (
                  <>
                    <button
                      className={`btn-active ${canStart ? "" : "btn-disabled"}`}
                      onClick={() => onUpdateStatus(res._id, "ACTIVE")}
                      disabled={!canStart}
                      title={canStart ? "Démarrer la location" : reason}
                    >
                      🚗 Démarrer
                    </button>
                    {!canStart && <small className="action-hint">{reason}</small>}
                  </>
                )}
                {res.status === "ACTIVE" && (
                  <button
                    className="btn-complete"
                    onClick={() => onUpdateStatus(res._id, "COMPLETED")}
                  >
                    ✓ Terminer
                  </button>
                )}
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
      )}
    </div>
  );
}

function computeDossierStatus(user) {
  const kyc = user?.kyc || {};
  const hasStructuredDocs =
    Boolean(kyc?.driverLicenseFront?.url) ||
    Boolean(kyc?.driverLicenseBack?.url) ||
    Boolean(kyc?.idCardFront?.url) ||
    Boolean(kyc?.idCardBack?.url);

  const docTypes = hasStructuredDocs
    ? ["driverLicenseFront", "driverLicenseBack", "idCardFront", "idCardBack", "proofOfResidence"]
    : ["driverLicensePhoto", "proofOfResidence"];

  const statuses = docTypes.map((t) =>
    String(kyc?.[t]?.status || (kyc?.[t]?.url ? "PENDING" : "MISSING")).toUpperCase()
  );
  if (statuses.some((s) => s === "REJECTED")) return "REJECTED";
  if (statuses.every((s) => s === "APPROVED")) return "APPROVED";
  if (statuses.some((s) => s === "PENDING")) return "PENDING";
  return "PENDING";
}

function DossierStatusPill({ status }) {
  const normalized = String(status || "PENDING").toUpperCase();
  const labelMap = { PENDING: "En attente", APPROVED: "Validé", REJECTED: "Refusé" };
  const classMap = { PENDING: "kyc-pill-pending", APPROVED: "kyc-pill-approved", REJECTED: "kyc-pill-rejected" };
  return <span className={`kyc-pill ${classMap[normalized] || "kyc-pill-pending"}`}>{labelMap[normalized] || normalized}</span>;
}

function ClientProfileModal({ open, user, token, onClose, onRefresh }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReason("");
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !user) return null;

  const kyc = user.kyc || {};
  // Must match the current "Documents" admin view
  const docDefs = [
    { key: "driverLicensePhoto", label: "Photo permis" },
    { key: "selfieWithLicense", label: "Selfie + permis" },
    { key: "proofOfResidence", label: "Justificatif domicile" },
  ];

  const docStatus = (key) => {
    const doc = kyc?.[key] || {};
    const url = doc?.url || user?.[key] || "";
    return String(doc?.status || (url ? "PENDING" : "MISSING")).toUpperCase();
  };
  const docUrl = (key) => {
    const doc = kyc?.[key] || {};
    const url = doc?.url || user?.[key] || "";
    return resolveMaybeUploadUrl(url);
  };

  const handleApprove = async () => {
    if (!token) return;
    setSaving(true);
    try {
      await reviewUserProfile(token, user._id, { status: "APPROVED" });
      onRefresh?.();
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!token) return;
    const trimmed = String(reason || "").trim();
    if (trimmed.length < 3) {
      alert("Merci de renseigner un motif (min. 3 caractères).");
      return;
    }
    setSaving(true);
    try {
      await reviewUserProfile(token, user._id, { status: "REJECTED", rejectedReason: trimmed });
      onRefresh?.();
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="admin-modal" role="dialog" aria-modal="true">
        <div className="admin-modal-top">
          <div className="admin-modal-title">
            Fiche client — {`${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email}
          </div>
          <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>
        <div className="admin-modal-body">
          <div className="client-profile-grid">
            <div className="client-profile-card">
              <div className="client-profile-row"><strong>Email</strong><span>{user.email}</span></div>
              <div className="client-profile-row"><strong>Téléphone</strong><span>{user.phone || "—"}</span></div>
              <div className="client-profile-row"><strong>Adresse</strong><span>{user.address?.street || "—"} {user.address?.zipCode || ""} {user.address?.city || ""}</span></div>
              <div className="client-profile-row"><strong>Inscription</strong><span>{user.createdAt ? new Date(user.createdAt).toLocaleDateString("fr-FR") : "—"}</span></div>
              <div className="client-profile-row"><strong>Dossier</strong><span><DossierStatusPill status={user.kycProfileStatus || computeDossierStatus(user)} /></span></div>
            </div>

            <div className="client-profile-card">
              <div className="client-profile-section-title">Documents</div>
              <div className="client-docs-list">
                {docDefs.map((d) => {
                  const url = docUrl(d.key);
                  return (
                    <div key={d.key} className="client-doc-row">
                      <div className="client-doc-left">
                        <div className="client-doc-name">{d.label}</div>
                        <div className="client-doc-meta">
                          <KycStatusPill status={docStatus(d.key)} />
                        </div>
                      </div>
                      <div className="client-doc-actions">
                        {url ? (
                          <>
                            <button type="button" className="kyc-preview-link" onClick={() => window.open(url, "_blank", "noreferrer")}>
                              Voir
                            </button>
                            <a className="kyc-preview-link" href={url} download>
                              Télécharger
                            </a>
                          </>
                        ) : (
                          <span className="kyc-preview-missing">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="client-profile-card" style={{ marginTop: 14 }}>
            <div className="client-profile-section-title">Historique des locations</div>
            {Array.isArray(user.reservations) && user.reservations.length ? (
              <div className="client-history">
                {user.reservations.slice(0, 8).map((r) => (
                  <div key={r._id} className="client-history-row">
                    <div>
                      <strong>{r.status}</strong>{" "}
                      <span className="client-history-muted">
                        {new Date(r.startDate).toLocaleDateString("fr-FR")} → {new Date(r.endDate).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                    <div><strong>{r.totalPrice}€</strong></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="client-history-empty">Aucune location.</div>
            )}
          </div>

          <div className="client-profile-actions">
            <button type="button" className="kyc-approve" disabled={saving} onClick={handleApprove}>
              Valider le profil
            </button>
            <div className="client-profile-reject">
              <input
                className="kyc-reason-input"
                placeholder="Motif de refus (envoyé par email plus tard)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={saving}
              />
              <button type="button" className="kyc-reject" disabled={saving} onClick={handleReject}>
                Refuser le profil
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Liste des utilisateurs
function UsersView({ users = [], onToggleActive }) {
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (u) => {
      if (!q) return true;
      const name = `${u.firstName || ""} ${u.lastName || ""}`.trim().toLowerCase();
      const email = String(u.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    };
    const statusOk = (u) => {
      const st = String(u?.kycProfileStatus || computeDossierStatus(u)).toUpperCase();
      const target = String(statusFilter || "ALL").toUpperCase();
      if (target === "ALL") return true;
      return st === target;
    };
    const dateOk = (u) => {
      if (!from && !to) return true;
      const created = u.createdAt ? new Date(u.createdAt) : null;
      if (!created) return false;
      if (from) {
        const f = new Date(from);
        if (created < f) return false;
      }
      if (to) {
        const t = new Date(to);
        t.setHours(23, 59, 59, 999);
        if (created > t) return false;
      }
      return true;
    };
    return users.filter((u) => matches(u) && statusOk(u) && dateOk(u));
  }, [from, query, statusFilter, to, users]);

  return (
    <div className="users-view">
      <ClientProfileModal
        open={Boolean(selectedUser)}
        user={selectedUser}
        token={token}
        onClose={() => setSelectedUser(null)}
        onRefresh={() => {}}
      />

      <div className="kyc-filterbar">
        <div className="kyc-filter-controls">
          <input className="kyc-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher (nom / email)…" />
          <select className="kyc-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">Tous statuts</option>
            <option value="PENDING">En attente</option>
            <option value="APPROVED">Validé</option>
            <option value="REJECTED">Refusé</option>
          </select>
          <input className="kyc-select" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input className="kyc-select" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="kyc-filter-count">{filtered.length} client{filtered.length > 1 ? "s" : ""}</div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>👥 Aucun utilisateur trouvé</p>
        </div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
            <th>Nom</th>
            <th>Email</th>
            <th>Téléphone</th>
            <th>Dossier</th>
            <th>Type compte</th>
            <th>Réservations</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((u) => (
            <tr key={u._id} onDoubleClick={() => setSelectedUser(u)} style={{ cursor: "pointer" }}>
              <td>
                {u.firstName} {u.lastName}
              </td>
              <td>{u.email}</td>
              <td>{u.phone}</td>
              <td>
                <DossierStatusPill status={u.kycProfileStatus || computeDossierStatus(u)} />
              </td>
              <td>
                {u.hasPassword ? (
                  <span className="badge-account">Compte complet</span>
                ) : (
                  <span className="badge-guest">Invité</span>
                )}
              </td>
              <td>{u.reservations?.length || 0}</td>
              <td>
                {u.isActive ? (
                  <span className="badge-active">Actif</span>
                ) : (
                  <span className="badge-inactive">Inactif</span>
                )}
              </td>
              <td>
                <button
                  className="btn-approve"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedUser(u);
                  }}
                >
                  Fiche
                </button>
                <button
                  className={u.isActive ? "btn-deactivate" : "btn-activate"}
                  onClick={() => onToggleActive(u._id, u.isActive)}
                >
                  {u.isActive ? "Désactiver" : "Activer"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      )}
    </div>
  );
}

// Modal pour gérer les périodes bloquées
function BlockedPeriodsModal({ car, token, onClose }) {
  const [blockedPeriods, setBlockedPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    startDate: "",
    endDate: "",
    reason: "",
  });

  useEffect(() => {
    loadBlockedPeriods();
  }, []);

  async function loadBlockedPeriods() {
    setLoading(true);
    try {
      const response = await getBlockedPeriods(token, car._id);
      setBlockedPeriods(response);
    } catch (err) {
      alert(err.message || "Erreur lors du chargement des blocages");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddBlock(e) {
    e.preventDefault();
    
    if (!formData.startDate || !formData.endDate) {
      alert("Veuillez remplir les dates");
      return;
    }

    try {
      await createBlockedPeriod(token, car._id, formData);
      setFormData({ startDate: "", endDate: "", reason: "" });
      loadBlockedPeriods();
    } catch (err) {
      alert(err.message || "Erreur lors de la création du blocage");
    }
  }

  async function handleDeleteBlock(blockId) {
    if (!window.confirm("Supprimer ce blocage ?")) {
      return;
    }

    try {
      await deleteBlockedPeriod(token, blockId);
      loadBlockedPeriods();
    } catch (err) {
      alert(err.message || "Erreur lors de la suppression");
    }
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Blocages - {car.brand} {car.model}</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleAddBlock} className="block-form">
            <h3>Ajouter un blocage</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Date début</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Date fin</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label>Raison (optionnel)</label>
              <input
                type="text"
                placeholder="Maintenance, révision..."
                value={formData.reason}
                onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
              />
            </div>
            <button type="submit" className="btn-approve">Ajouter le blocage</button>
          </form>

          <h3 style={{ marginTop: "2rem" }}>Blocages actifs</h3>
          {loading ? (
            <p>Chargement...</p>
          ) : blockedPeriods.length === 0 ? (
            <p className="empty-state">Aucun blocage pour cette voiture</p>
          ) : (
            <ul className="blocks-list">
              {blockedPeriods.map((block) => (
                <li key={block._id} className="block-item">
                  <div className="block-info">
                    <strong>{formatDate(block.startDate)} → {formatDate(block.endDate)}</strong>
                    <br />
                    <small>{block.reason || "Aucune raison spécifiée"}</small>
                  </div>
                  <button
                    className="btn-deactivate"
                    onClick={() => handleDeleteBlock(block._id)}
                  >
                    Supprimer
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function CarsView({ cars = [], onUpdateCar, onCreateCar }) {
  const { token } = useAuth();
  const [editingCarId, setEditingCarId] = useState(null);
  const [selectedCarForBlocks, setSelectedCarForBlocks] = useState(null);
  const [selectedCarId, setSelectedCarId] = useState(null);
  const [vehicleFilePanelOpen, setVehicleFilePanelOpen] = useState(false);
  const [createPanelOpen, setCreatePanelOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [formData, setFormData] = useState({
    licensePlate: "",
    category: "CITADINE",
    pricePerDay: "",
    priceWeekday: "",
    priceWeekend: "",
    description: "",
    status: "DISPONIBLE",
    seats: "",
    luggage: "",
    transmission: "Manuel",
    fuel: "Essence",
    imageUrl: "",
  });
  const [createFormData, setCreateFormData] = useState({
    brand: "",
    model: "",
    description: "",
    pricePerDay: "",
    priceWeekday: "",
    priceWeekend: "",
    mileage: "0",
    fuel: "Essence",
    transmission: "Manuel",
    seats: "5",
    doors: "5",
    luggage: "2",
    licensePlate: "",
    year: String(new Date().getFullYear()),
    color: "",
    category: "CITADINE",
    status: "DISPONIBLE",
    imageUrl: "",
    imageFile: null,
    imageUrls: [], // URLs des images multiples
    imageFiles: [], // Fichiers multiples
  });
  const [carSearch, setCarSearch] = useState("");
  const [carStatusFilter, setCarStatusFilter] = useState("ALL");
  const [carCategoryFilter, setCarCategoryFilter] = useState("ALL");
  const [carSort, setCarSort] = useState("recent");

  const uploadImage = useCallback(
    async (file) => {
      const response = await uploadCarImagesApi(token, [file]);
      const firstUrl = response?.urls?.[0];
      if (!firstUrl) {
        throw new Error("Échec de l'upload de l'image");
      }
      return firstUrl;
    },
    [token]
  );

  const handleStartEdit = (car) => {
    const fallbackPrice = Number(car.pricePerDay || 0);
    const weekday = Number(car.priceWeekday || 0) > 0 ? Number(car.priceWeekday) : fallbackPrice;
    const weekend = Number(car.priceWeekend || 0) > 0 ? Number(car.priceWeekend) : fallbackPrice;
    setEditingCarId(car._id);
    setFormData({
      licensePlate: car.licensePlate ?? "",
      category: car.category ?? "CITADINE",
      pricePerDay: String(car.pricePerDay ?? ""),
      priceWeekday: weekday ? String(weekday) : "",
      priceWeekend: weekend ? String(weekend) : "",
      year: String(car.year ?? ""),
      brand: car.brand ?? "",
      model: car.model ?? "",
      mileage: String(car.mileage ?? ""),
      doors: String(car.doors ?? ""),
      color: car.color ?? "",
      description: car.description ?? "",
      status: car.status ?? "DISPONIBLE",
      seats: String(car.seats ?? ""),
      luggage: String(car.luggage ?? ""),
      transmission: car.transmission ?? "Manuel",
      fuel: car.fuel ?? "Essence",
      imageUrl: car.imageUrl ?? "",
    });
  };

  const handleCancelEdit = () => {
    setEditingCarId(null);
  };

  const handleSave = async () => {
    if (!editingCarId) {
      return;
    }

    const toOptionalInt = (value) => {
      if (value === "" || value === undefined || value === null) return undefined;
      const n = Number.parseInt(String(value), 10);
      return Number.isFinite(n) ? n : undefined;
    };
    const toOptionalNumber = (value) => {
      if (value === "" || value === undefined || value === null) return undefined;
      const n = Number(value);
      return Number.isFinite(n) ? n : undefined;
    };

    try {
      await onUpdateCar(editingCarId, {
        brand: formData.brand?.trim(),
        model: formData.model?.trim(),
        licensePlate: formData.licensePlate.trim().toUpperCase(),
        category: formData.category,
        // keep legacy pricePerDay aligned for older screens
        pricePerDay: Number(formData.priceWeekday || formData.pricePerDay),
        priceWeekday: Number(formData.priceWeekday),
        priceWeekend: Number(formData.priceWeekend),
        year: toOptionalInt(formData.year),
        mileage: toOptionalNumber(formData.mileage),
        doors: toOptionalInt(formData.doors),
        color: formData.color,
        description: formData.description,
        status: formData.status,
        seats: toOptionalInt(formData.seats),
        luggage: toOptionalInt(formData.luggage),
        transmission: formData.transmission,
        fuel: formData.fuel,
        imageUrl: formData.imageUrl,
      });
      setEditingCarId(null);
    } catch (err) {
      // keep edit mode so the user can fix inputs
    }
  };

  const resetCreateForm = () => {
    setCreateFormData({
      brand: "",
      model: "",
      description: "",
      pricePerDay: "",
      priceWeekday: "",
      priceWeekend: "",
      mileage: "0",
      fuel: "Essence",
      transmission: "Manuel",
      seats: "5",
      doors: "5",
      luggage: "2",
      licensePlate: "",
      year: String(new Date().getFullYear()),
      color: "",
      category: "CITADINE",
      status: "DISPONIBLE",
      imageUrl: "",
      imageFile: null,
      imageFiles: [],
    });
  };

  const handleCreateVehicle = async (e) => {
    e.preventDefault();
    setCreateError("");
    setCreateSuccess("");
    setCreateSubmitting(true);
    try {
      let imageUrl = createFormData.imageUrl;
      // Upload image principale si fichier sélectionné
      if (createFormData.imageFile) {
        imageUrl = await uploadImage(createFormData.imageFile);
      }
      // Upload images multiples
      let imageUrls = [];
      if (createFormData.imageFiles && createFormData.imageFiles.length > 0) {
        for (const file of createFormData.imageFiles) {
          const url = await uploadImage(file);
          imageUrls.push(url);
        }
      }
      await onCreateCar({
        brand: createFormData.brand.trim(),
        model: createFormData.model.trim(),
        description: createFormData.description.trim(),
        // keep legacy pricePerDay aligned for older screens
        pricePerDay: Number(createFormData.priceWeekday),
        priceWeekday: Number(createFormData.priceWeekday),
        priceWeekend: Number(createFormData.priceWeekend),
        mileage: Number(createFormData.mileage || 0),
        fuel: createFormData.fuel,
        transmission: createFormData.transmission,
        seats: Number(createFormData.seats),
        doors: Number(createFormData.doors),
        luggage: Number(createFormData.luggage),
        licensePlate: createFormData.licensePlate.trim().toUpperCase(),
        year: Number(createFormData.year),
        color: createFormData.color.trim(),
        category: createFormData.category,
        status: createFormData.status,
        imageUrl,
        imageUrls,
      });
      setCreateSuccess("Véhicule créé avec succès.");
      resetCreateForm();
      setTimeout(() => {
        setCreatePanelOpen(false);
      }, 700);
    } catch (err) {
      setCreateError(err.message || "Erreur lors de la création du véhicule.");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const availableStatuses = useMemo(() => {
    const values = Array.from(
      new Set(
        cars
          .map((car) => String(car.status || "").toUpperCase())
          .filter(Boolean)
      )
    );
    return values.sort();
  }, [cars]);

  const availableCategories = useMemo(() => {
    const values = Array.from(
      new Set(
        cars
          .map((car) => String(car.category || "").toUpperCase())
          .filter(Boolean)
      )
    );
    return values.sort();
  }, [cars]);

  const filteredCars = useMemo(() => {
    const normalizedSearch = carSearch.trim().toLowerCase();

    const list = cars.filter((car) => {
      if (carStatusFilter !== "ALL" && String(car.status).toUpperCase() !== carStatusFilter) {
        return false;
      }

      if (carCategoryFilter !== "ALL" && String(car.category).toUpperCase() !== carCategoryFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        car.brand,
        car.model,
        car.licensePlate,
        car.category,
        car.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });

    if (carSort === "priceAsc") {
      return [...list].sort((a, b) => Number(a.pricePerDay || 0) - Number(b.pricePerDay || 0));
    }
    if (carSort === "priceDesc") {
      return [...list].sort((a, b) => Number(b.pricePerDay || 0) - Number(a.pricePerDay || 0));
    }
    if (carSort === "yearDesc") {
      return [...list].sort((a, b) => Number(b.year || 0) - Number(a.year || 0));
    }
    if (carSort === "nameAsc") {
      return [...list].sort((a, b) =>
        `${a.brand || ""} ${a.model || ""}`.localeCompare(`${b.brand || ""} ${b.model || ""}`)
      );
    }

    return list;
  }, [cars, carSearch, carStatusFilter, carCategoryFilter, carSort]);


  return (
    <div className="cars-view admin-modern-surface">
      <div className="cars-view-header">
        <h2>Liste des véhicules</h2>
        <button
          className="btn-approve"
          onClick={() => {
            setCreateError("");
            setCreateSuccess("");
            setCreatePanelOpen(true);
          }}
        >
          + Ajouter un véhicule
        </button>
      </div>

      <div className="admin-cars-filters">
        <div className="admin-cars-filter-item admin-cars-filter-grow">
          <label>Rechercher</label>
          <input
            className="admin-input"
            type="text"
            value={carSearch}
            onChange={(event) => setCarSearch(event.target.value)}
            placeholder="Marque, modèle, plaque..."
          />
        </div>
        <div className="admin-cars-filter-item">
          <label>Statut</label>
          <select
            className="admin-select"
            value={carStatusFilter}
            onChange={(event) => setCarStatusFilter(event.target.value)}
          >
            <option value="ALL">Tous</option>
            {availableStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <div className="admin-cars-filter-item">
          <label>Catégorie</label>
          <select
            className="admin-select"
            value={carCategoryFilter}
            onChange={(event) => setCarCategoryFilter(event.target.value)}
          >
            <option value="ALL">Toutes</option>
            {availableCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <div className="admin-cars-filter-item">
          <label>Trier</label>
          <select
            className="admin-select"
            value={carSort}
            onChange={(event) => setCarSort(event.target.value)}
          >
            <option value="recent">Plus récents</option>
            <option value="priceAsc">Prix croissant</option>
            <option value="priceDesc">Prix décroissant</option>
            <option value="yearDesc">Année décroissante</option>
            <option value="nameAsc">Nom A-Z</option>
          </select>
        </div>
      </div>

      {filteredCars.length === 0 ? (
        <div className="empty-state">
          <p>🚗 Aucune voiture ne correspond à ce filtre</p>
        </div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Photo</th>
              <th>Voiture</th>
              <th>Plaque</th>
              <th>Année</th>
              <th>Prix</th>
              <th>Statut</th>
              <th>Catégorie</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCars.map((car) => {
              const isEditing = editingCarId === car._id;
              return (
                <tr key={car._id}>
                  <td>
                    <CarPhotoHoverSlideshow car={car} />
                  </td>
                  <td>
                    <strong>{car.brand} {car.model}</strong>
                    <br />
                    <small>{car.category}</small>
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        className="admin-input"
                        type="text"
                        placeholder="Plaque"
                        value={formData.licensePlate}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, licensePlate: e.target.value }))
                        }
                      />
                    ) : (
                      car.licensePlate
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        className="admin-input"
                        type="number"
                        min="1990"
                        max="2100"
                        value={formData.year || car.year || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, year: e.target.value }))
                        }
                      />
                    ) : (
                      car.year || "-"
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        <input
                          className="admin-input"
                          type="number"
                          min="1"
                          placeholder="Semaine (€/j)"
                          value={formData.priceWeekday}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, priceWeekday: e.target.value }))
                          }
                        />
                        <input
                          className="admin-input"
                          type="number"
                          min="1"
                          placeholder="Week-end (€/j)"
                          value={formData.priceWeekend}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, priceWeekend: e.target.value }))
                          }
                        />
                      </div>
                    ) : (
                      <div style={{ display: "grid", gap: 2 }}>
                        <div><strong>Semaine:</strong> {Number(car.priceWeekday || car.pricePerDay)}€ /j</div>
                        <div><strong>Week-end:</strong> {Number(car.priceWeekend || car.pricePerDay)}€ /j</div>
                      </div>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <select
                        className="admin-select"
                        value={formData.status}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, status: e.target.value }))
                        }
                      >
                        <option value="DISPONIBLE">DISPONIBLE</option>
                        <option value="RESERVATION">RESERVATION</option>
                        <option value="MAINTENANCE">MAINTENANCE</option>
                        <option value="INDISPONIBLE">INDISPONIBLE</option>
                      </select>
                    ) : (
                      <span className={`status-badge ${String(car.status).toLowerCase()}`}>
                        {car.status}
                      </span>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <select
                        className="admin-select"
                        value={formData.category}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, category: e.target.value }))
                        }
                      >
                        <option value="CITADINE">CITADINE</option>
                        <option value="BREAK">BREAK</option>
                        <option value="BERLINE">BERLINE</option>
                      </select>
                    ) : (
                      <span className="car-category-pill">{car.category || "-"}</span>
                    )}
                  </td>
                  <td className="actions-cell">
                    {isEditing ? (
                      <>
                        <button className="btn-approve" onClick={async () => {
                          await onUpdateCar(editingCarId, {
                            brand: formData.brand?.trim(),
                            model: formData.model?.trim(),
                            licensePlate: formData.licensePlate.trim().toUpperCase(),
                            category: formData.category,
                            // keep legacy pricePerDay aligned for older screens
                            pricePerDay: Number(formData.priceWeekday || formData.pricePerDay),
                            priceWeekday: Number(formData.priceWeekday),
                            priceWeekend: Number(formData.priceWeekend),
                            year: formData.year === "" || formData.year === undefined ? undefined : Number(formData.year),
                            mileage: formData.mileage === "" ? undefined : Number(formData.mileage),
                            doors: formData.doors === "" ? undefined : Number(formData.doors),
                            color: formData.color,
                            description: formData.description,
                            status: formData.status,
                            seats: Number(formData.seats),
                            luggage: Number(formData.luggage),
                            transmission: formData.transmission,
                            fuel: formData.fuel,
                            imageUrl: formData.imageUrl,
                          });
                          setEditingCarId(null);
                        }}>
                          Sauvegarder
                        </button>
                        <button className="btn-deactivate" onClick={handleCancelEdit}>
                          Annuler
                        </button>
                      </>
                    ) : (
                      <div className="icon-actions">
                        <button
                          className="icon-action-btn"
                          data-tooltip="Voir la fiche véhicule"
                          onClick={() => {
                            setSelectedCarId(car._id);
                            setVehicleFilePanelOpen(true);
                          }}
                        >
                          👁
                        </button>
                        <button
                          className="icon-action-btn"
                          data-tooltip="Gérer les blocages"
                          onClick={() => setSelectedCarForBlocks(car)}
                        >
                          ⛔
                        </button>
                        <button
                          className="icon-action-btn"
                          data-tooltip="Modifier la voiture"
                          onClick={() => handleStartEdit(car)}
                        >
                          ✎
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {createPanelOpen && (
        <>
          <div className="vehicle-file-overlay" onClick={() => setCreatePanelOpen(false)} />
          <div className="vehicle-create-panel">
            <div className="vehicle-create-header">
              <h3>Créer un véhicule</h3>
              <button className="vehicle-file-close" onClick={() => setCreatePanelOpen(false)}>
                ×
              </button>
            </div>

            {createError && <div className="admin-error">{createError}</div>}
            {createSuccess && <div className="admin-success">{createSuccess}</div>}

            <form className="vehicle-create-form" onSubmit={handleCreateVehicle}>
              <div className="vehicle-create-grid">
                <label>
                  Marque *
                  <input
                    className="admin-input"
                    type="text"
                    value={createFormData.brand}
                    onChange={(e) => setCreateFormData((prev) => ({ ...prev, brand: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Modèle *
                  <input
                    className="admin-input"
                    type="text"
                    value={createFormData.model}
                    onChange={(e) => setCreateFormData((prev) => ({ ...prev, model: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Plaque d'immatriculation *
                  <input
                    className="admin-input"
                    type="text"
                    value={createFormData.licensePlate}
                    onChange={(e) => setCreateFormData((prev) => ({ ...prev, licensePlate: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Année *
                  <input
                    className="admin-input"
                    type="number"
                    min="1990"
                    value={createFormData.year}
                    onChange={(e) => setCreateFormData((prev) => ({ ...prev, year: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Prix semaine (€/jour) *
                  <input
                    className="admin-input"
                    type="number"
                    min="1"
                    step="0.01"
                    value={createFormData.priceWeekday}
                    onChange={(e) => setCreateFormData((prev) => ({ ...prev, priceWeekday: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Prix week-end (€/jour) *
                  <input
                    className="admin-input"
                    type="number"
                    min="1"
                    step="0.01"
                    value={createFormData.priceWeekend}
                    onChange={(e) => setCreateFormData((prev) => ({ ...prev, priceWeekend: e.target.value }))}
                    required
                  />
                </label>

                <label>
                  Kilométrage
                  <input
                    className="admin-input"
                    type="number"
                    min="0"
                    value={createFormData.mileage}
                    onChange={(e) => setCreateFormData((prev) => ({ ...prev, mileage: e.target.value }))}
                  />
                </label>
                <label>
                  Places *
                  <input
                    className="admin-input"
                    type="number"
                    min="1"
                    value={createFormData.seats}
                    onChange={(e) => setCreateFormData((prev) => ({ ...prev, seats: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Portes
                  <input
                    className="admin-input"
                    type="number"
                    min="1"
                    value={createFormData.doors}
                    onChange={(e) => setCreateFormData((prev) => ({ ...prev, doors: e.target.value }))}
                  />
                </label>
                <label>
                  Bagages
                  <input
                    className="admin-input"
                    type="number"
                    min="0"
                    value={createFormData.luggage}
                    onChange={(e) => setCreateFormData((prev) => ({ ...prev, luggage: e.target.value }))}
                  />
                </label>
                <label>
                  Couleur
                  <input
                    className="admin-input"
                    type="text"
                    value={createFormData.color}
                    onChange={(e) => setCreateFormData((prev) => ({ ...prev, color: e.target.value }))}
                  />
                </label>
                <label>
                  Catégorie *
                  <select
                    className="admin-select"
                    value={createFormData.category}
                    onChange={(e) => setCreateFormData((prev) => ({ ...prev, category: e.target.value }))}
                    required
                  >
                    <option value="CITADINE">CITADINE</option>
                    <option value="BREAK">BREAK</option>
                    <option value="BERLINE">BERLINE</option>
                    <option value="SUV">SUV</option>
                    <option value="LUXE">LUXE</option>
                  </select>
                </label>
                <label>
                  Carburant *
                  <select
                    className="admin-select"
                    value={createFormData.fuel}
                    onChange={(e) => setCreateFormData((prev) => ({ ...prev, fuel: e.target.value }))}
                    required
                  >
                    <option value="Essence">Essence</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Électrique">Électrique</option>
                    <option value="Hybride">Hybride</option>
                  </select>
                </label>
                <label>
                  Boîte *
                  <select
                    className="admin-select"
                    value={createFormData.transmission}
                    onChange={(e) => setCreateFormData((prev) => ({ ...prev, transmission: e.target.value }))}
                    required
                  >
                    <option value="Manuel">Manuel</option>
                    <option value="Auto">Auto</option>
                  </select>
                </label>
                <label>
                  Statut
                  <select
                    className="admin-select"
                    value={createFormData.status}
                    onChange={(e) => setCreateFormData((prev) => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="DISPONIBLE">DISPONIBLE</option>
                    <option value="RESERVATION">RESERVATION</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                    <option value="INDISPONIBLE">INDISPONIBLE</option>
                  </select>
                </label>
                <label className="vehicle-create-full-width">
                  Image principale (upload)
                  <input
                    className="admin-input"
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file && file.size > 5 * 1024 * 1024) {
                        setCreateError("Image trop volumineuse (max 5Mo)");
                        return;
                      }
                      setCreateFormData(prev => ({ ...prev, imageFile: file, imageUrl: "" }));
                    }}
                  />
                  {createFormData.imageFile && (
                    <img
                      src={URL.createObjectURL(createFormData.imageFile)}
                      alt="Aperçu"
                      style={{ maxWidth: 120, marginTop: 8, borderRadius: 8 }}
                    />
                  )}
                </label>
                <label className="vehicle-create-full-width">
                  Images supplémentaires (upload, max 5Mo chacune)
                  <input
                    className="admin-input"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={e => {
                      const files = Array.from(e.target.files || []);
                      if (files.some(f => f.size > 5 * 1024 * 1024)) {
                        setCreateError("Une des images est trop volumineuse (max 5Mo)");
                        return;
                      }
                      setCreateFormData(prev => ({ ...prev, imageFiles: files }));
                    }}
                  />
                  {createFormData.imageFiles && createFormData.imageFiles.length > 0 && (
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      {createFormData.imageFiles.map((file, idx) => (
                        <img
                          key={idx}
                          src={URL.createObjectURL(file)}
                          alt={`Aperçu ${idx + 1}`}
                          style={{ maxWidth: 80, borderRadius: 6 }}
                        />
                      ))}
                    </div>
                  )}
                </label>
                <label className="vehicle-create-full-width">
                  Description
                  <textarea
                    className="admin-input"
                    rows={4}
                    value={createFormData.description}
                    onChange={(e) => setCreateFormData((prev) => ({ ...prev, description: e.target.value }))}
                  />
                </label>
              </div>

              <div className="vehicle-create-actions">
                <button
                  type="button"
                  className="btn-deactivate"
                  onClick={() => setCreatePanelOpen(false)}
                  disabled={createSubmitting}
                >
                  Annuler
                </button>
                <button type="submit" className="btn-approve" disabled={createSubmitting}>
                  {createSubmitting ? "Création..." : "Créer le véhicule"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {vehicleFilePanelOpen && selectedCarId && cars.find(c => c._id === selectedCarId) && (
        <>
          <div className="vehicle-file-overlay" onClick={() => setVehicleFilePanelOpen(false)} />
          <div className="vehicle-file-panel">
            <VehicleFileCard
              car={cars.find(c => c._id === selectedCarId)}
              token={token}
              onUpdateCar={onUpdateCar}
              onManageBlocks={setSelectedCarForBlocks}
              onClose={() => setVehicleFilePanelOpen(false)}
            />
          </div>
        </>
      )}

      {selectedCarForBlocks && (
        <BlockedPeriodsModal
          car={selectedCarForBlocks}
          token={token}
          onClose={() => setSelectedCarForBlocks(null)}
        />
      )}
    </div>
  );
}

function VehicleFileCard({ car, token, onUpdateCar, onManageBlocks, onClose }) {
  const currentYear = new Date().getFullYear();
  const [activeSection, setActiveSection] = useState("identity");
  const [loading, setLoading] = useState(true);
  const [gallerySaving, setGallerySaving] = useState(false);
  const [galleryError, setGalleryError] = useState("");
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [galleryHover, setGalleryHover] = useState(false);
  const [galleryImages, setGalleryImages] = useState(() => {
    const images = [];
    if (Array.isArray(car.imageUrls)) {
      images.push(
        ...car.imageUrls.filter((item) => typeof item === "string" && item.trim())
      );
    }
    if (car.imageUrl && !images.includes(car.imageUrl)) {
      images.unshift(car.imageUrl);
    }
    return images;
  });
  const [maintenanceSummary, setMaintenanceSummary] = useState(null);
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [blockedPeriods, setBlockedPeriods] = useState([]);
  const [operationsKpis, setOperationsKpis] = useState({
    completedRentals: 0,
    turnover: 0,
    averageRevenuePerRental: 0,
    lastRentalDate: null,
  });

  useEffect(() => {
    const images = [];
    if (Array.isArray(car.imageUrls)) {
      images.push(
        ...car.imageUrls.filter((item) => typeof item === "string" && item.trim())
      );
    }
    if (car.imageUrl && !images.includes(car.imageUrl)) {
      images.unshift(car.imageUrl);
    }
    setGalleryImages(images);
  }, [car.imageUrl, car.imageUrls]);

  useEffect(() => {
    setActiveGalleryIndex((previous) => {
      if (galleryImages.length === 0) {
        return 0;
      }
      return Math.min(previous, galleryImages.length - 1);
    });
  }, [galleryImages]);

  useEffect(() => {
    if (!galleryHover || galleryImages.length <= 1) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      setActiveGalleryIndex((previous) => (previous + 1) % galleryImages.length);
    }, 900);

    return () => clearInterval(intervalId);
  }, [galleryHover, galleryImages.length]);

  useEffect(() => {
    async function loadVehicleFile() {
      setLoading(true);
      try {
        const [maintenanceResponse, blockedPeriodsResponse, reservationsResponse] = await Promise.all([
          getMaintenanceRecords(token, { carId: car._id, year: currentYear }),
          getBlockedPeriods(token, car._id),
          getAllReservations(token),
        ]);

        const vehicleReservations = (reservationsResponse || []).filter((reservation) => {
          if (!reservation?.car) return false;
          const reservationCarId = typeof reservation.car === "object" ? reservation.car?._id : reservation.car;
          return String(reservationCarId) === String(car._id);
        });

        const revenueStatuses = ["CONFIRMED", "ACTIVE", "COMPLETED"];
        const completedReservations = vehicleReservations.filter((reservation) => reservation.status === "COMPLETED");
        const revenueReservations = vehicleReservations.filter((reservation) => revenueStatuses.includes(reservation.status));

        const turnover = revenueReservations.reduce(
          (sum, reservation) => sum + (Number(reservation.totalPrice) || 0),
          0
        );

        const completedTurnover = completedReservations.reduce(
          (sum, reservation) => sum + (Number(reservation.totalPrice) || 0),
          0
        );

        const lastReservationDate = [...vehicleReservations]
          .filter((reservation) => reservation.status !== "CANCELLED")
          .sort((left, right) => new Date(right.endDate) - new Date(left.endDate))[0]?.endDate || null;

        setOperationsKpis({
          completedRentals: completedReservations.length,
          turnover,
          averageRevenuePerRental:
            completedReservations.length > 0 ? completedTurnover / completedReservations.length : 0,
          lastRentalDate: lastReservationDate,
        });

        setMaintenanceSummary(maintenanceResponse.summary || null);
        setMaintenanceRecords(maintenanceResponse.records || []);
        setBlockedPeriods(blockedPeriodsResponse || []);
      } catch (err) {
        setMaintenanceSummary(null);
        setMaintenanceRecords([]);
        setBlockedPeriods([]);
        setOperationsKpis({
          completedRentals: 0,
          turnover: 0,
          averageRevenuePerRental: 0,
          lastRentalDate: null,
        });
      } finally {
        setLoading(false);
      }
    }

    loadVehicleFile();
  }, [car._id, currentYear, token]);

  const nextBlocks = blockedPeriods.slice(0, 3);
  const activeGalleryImage = galleryImages[activeGalleryIndex] || "";

  async function handleGalleryUpload(event) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      return;
    }

    if (files.some((file) => file.size > 5 * 1024 * 1024)) {
      setGalleryError("Une des images est trop volumineuse (max 5Mo).");
      event.target.value = "";
      return;
    }

    setGalleryError("");
    setGallerySaving(true);

    try {
      const response = await uploadCarImagesApi(token, files);
      const uploadedUrls = Array.isArray(response?.urls) ? response.urls : [];
      if (uploadedUrls.length === 0) {
        throw new Error("Aucune image n'a été uploadée.");
      }

      const nextGallery = [...galleryImages, ...uploadedUrls];
      const deduplicated = Array.from(
        new Set(nextGallery.filter((url) => typeof url === "string" && url.trim()))
      );

      await onUpdateCar(car._id, {
        imageUrl: deduplicated[0] || "",
        imageUrls: deduplicated,
      });

      setGalleryImages(deduplicated);
    } catch (error) {
      setGalleryError(error.message || "Erreur lors de l'upload des images.");
    } finally {
      setGallerySaving(false);
      event.target.value = "";
    }
  }

  async function handleRemoveGalleryImage(indexToRemove) {
    if (gallerySaving) {
      return;
    }

    const nextGallery = galleryImages.filter((_, index) => index !== indexToRemove);
    setGalleryError("");
    setGallerySaving(true);

    try {
      await onUpdateCar(car._id, {
        imageUrl: nextGallery[0] || "",
        imageUrls: nextGallery,
      });

      setGalleryImages(nextGallery);
      setActiveGalleryIndex((previous) => {
        if (nextGallery.length === 0) {
          return 0;
        }
        return Math.min(previous, nextGallery.length - 1);
      });
    } catch (error) {
      setGalleryError(error.message || "Erreur lors de la suppression de l'image.");
    } finally {
      setGallerySaving(false);
    }
  }

  return (
    <section className="vehicle-file-card">
      <div className="vehicle-file-header">
        <div>
          <p className="vehicle-file-eyebrow">Fiche véhicule</p>
          <h2>{car.brand} {car.model}</h2>
          <p className="vehicle-file-subtitle">
            {car.licensePlate} · {car.category} · {car.year}
          </p>
        </div>
        <div className="vehicle-file-header-meta">
          <span className={`status-badge ${String(car.status).toLowerCase()}`}>
            {car.status}
          </span>
          <strong>
            {formatCurrency(car.priceWeekday || car.pricePerDay)} /j (semaine) ·{" "}
            {formatCurrency(car.priceWeekend || car.pricePerDay)} /j (week-end)
          </strong>
          {onClose && (
            <button className="vehicle-file-close" onClick={onClose}>
              ×
            </button>
          )}
        </div>
      </div>

      <div className="vehicle-file-nav">
        <button
          className={activeSection === "identity" ? "active" : ""}
          onClick={() => setActiveSection("identity")}
        >
          Identité
        </button>
        <button
          className={activeSection === "operations" ? "active" : ""}
          onClick={() => setActiveSection("operations")}
        >
          Exploitation
        </button>
        <button
          className={activeSection === "maintenance" ? "active" : ""}
          onClick={() => setActiveSection("maintenance")}
        >
          Entretien
        </button>
      </div>

      {loading ? (
        <p>Chargement de la fiche...</p>
      ) : (
        <>
          <div className="vehicle-operations-kpis">
            <article className="vehicle-operations-kpi-card">
              <p>Locations terminées</p>
              <strong>{operationsKpis.completedRentals}</strong>
            </article>
            <article className="vehicle-operations-kpi-card">
              <p>Chiffre d'affaires</p>
              <strong>{formatCurrency(operationsKpis.turnover)}</strong>
            </article>
            <article className="vehicle-operations-kpi-card">
              <p>Revenu moyen / location</p>
              <strong>{formatCurrency(operationsKpis.averageRevenuePerRental)}</strong>
            </article>
            <article className="vehicle-operations-kpi-card">
              <p>Dernière location</p>
              <strong>
                {operationsKpis.lastRentalDate
                  ? new Date(operationsKpis.lastRentalDate).toLocaleDateString("fr-FR")
                  : "Aucune"}
              </strong>
            </article>
          </div>

          {activeSection === "identity" && (
            <div className="vehicle-file-content">
              {/* Galerie */}
              <div className="vehicle-file-section">
                <h3 className="vehicle-file-section-title">
                  📷 Galerie
                  <span className="vehicle-file-section-subtitle">ajouter les photos de votre bien</span>
                </h3>
                <div
                  className="vehicle-gallery-main"
                  onMouseEnter={() => setGalleryHover(true)}
                  onMouseLeave={() => setGalleryHover(false)}
                >
                  {activeGalleryImage ? (
                    <img
                      src={resolveImageUrl(activeGalleryImage)}
                      alt={`${car.brand} ${car.model}`}
                      className="vehicle-gallery-main-image"
                      onError={(event) => {
                        event.currentTarget.src = FALLBACK_CAR_IMAGE;
                      }}
                    />
                  ) : (
                    <div className="vehicle-gallery-empty">Aucune image</div>
                  )}
                  {galleryImages.length > 1 && (
                    <div className="vehicle-gallery-counter">
                      {activeGalleryIndex + 1}/{galleryImages.length}
                    </div>
                  )}
                </div>

                <div className="vehicle-gallery-thumbnails">
                  {galleryImages.map((url, index) => (
                    <div
                      key={`${url}-${index}`}
                      className={`vehicle-gallery-thumb-item ${index === activeGalleryIndex ? "active" : ""}`}
                      onMouseEnter={() => setActiveGalleryIndex(index)}
                    >
                      <img
                        src={resolveImageUrl(url)}
                        alt={`${car.brand} ${car.model} ${index + 1}`}
                        className="vehicle-gallery-image"
                        onError={(event) => {
                          event.currentTarget.src = FALLBACK_CAR_IMAGE;
                        }}
                      />
                      <button
                        type="button"
                        className="vehicle-gallery-remove"
                        onClick={() => handleRemoveGalleryImage(index)}
                        aria-label="Supprimer l'image"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <label className="vehicle-gallery-add" title="Ajouter des photos">
                    <span style={{ fontSize: "24px" }}>+</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleGalleryUpload}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>
                {gallerySaving && <p style={{ marginTop: 8 }}>Upload en cours...</p>}
                {galleryImages.length > 1 && (
                  <p style={{ marginTop: 8, color: "#6b7280", fontSize: 12 }}>
                    Survole l'image principale pour faire defiler automatiquement les photos.
                  </p>
                )}
                {galleryError && <p style={{ marginTop: 8, color: "#b91c1c" }}>{galleryError}</p>}
              </div>

              {/* Informations générales */}
              <div className="vehicle-file-section">
                <h3 className="vehicle-file-section-title">
                  ℹ️ Informations générales
                  <span className="vehicle-file-section-subtitle">éditer les informations de votre bien</span>
                </h3>
                <div className="vehicle-info-grid">
                  <div className="vehicle-info-row">
                    <div className="vehicle-info-label">
                      <span className="vehicle-info-icon">🆔</span>
                      N° d'identification
                    </div>
                    <div className="vehicle-info-value">{car.licensePlate}</div>
                  </div>

                  <div className="vehicle-info-row">
                    <div className="vehicle-info-label">
                      <span className="vehicle-info-icon">📂</span>
                      Catégorie
                    </div>
                    <div className="vehicle-info-value">
                      <span className="info-badge">{car.category}</span>
                    </div>
                  </div>

                  <div className="vehicle-info-row">
                    <div className="vehicle-info-label">
                      <span className="vehicle-info-icon">📊</span>
                      Statut du bien
                    </div>
                    <div className="vehicle-info-value">
                      <span className={`status-badge ${String(car.status).toLowerCase()}`}>
                        {car.status}
                      </span>
                    </div>
                  </div>

                  <div className="vehicle-info-row">
                    <div className="vehicle-info-label">
                      <span className="vehicle-info-icon">🏷️</span>
                      Nom
                    </div>
                    <div className="vehicle-info-value">{car.brand} {car.model}</div>
                  </div>

                  <div className="vehicle-info-row">
                    <div className="vehicle-info-label">
                      <span className="vehicle-info-icon">🚗</span>
                      Marque
                    </div>
                    <div className="vehicle-info-value">{car.brand}</div>
                  </div>

                  <div className="vehicle-info-row">
                    <div className="vehicle-info-label">
                      <span className="vehicle-info-icon">📝</span>
                      Modèle
                    </div>
                    <div className="vehicle-info-value">{car.model}</div>
                  </div>

                  <div className="vehicle-info-row vehicle-info-row-full">
                    <div className="vehicle-info-label">
                      <span className="vehicle-info-icon">💬</span>
                      Description
                    </div>
                    <div className="vehicle-info-value vehicle-info-description">
                      {car.description || "-"}
                    </div>
                  </div>

                  <div className="vehicle-info-row">
                    <div className="vehicle-info-label">
                      <span className="vehicle-info-icon">📅</span>
                      Année
                    </div>
                    <div className="vehicle-info-value">{car.year || "-"}</div>
                  </div>

                  <div className="vehicle-info-row">
                    <div className="vehicle-info-label">
                      <span className="vehicle-info-icon">⚙️</span>
                      Transmission
                    </div>
                    <div className="vehicle-info-value">{car.transmission}</div>
                  </div>

                  <div className="vehicle-info-row">
                    <div className="vehicle-info-label">
                      <span className="vehicle-info-icon">⛽</span>
                      Carburant
                    </div>
                    <div className="vehicle-info-value">{car.fuel}</div>
                  </div>

                  <div className="vehicle-info-row">
                    <div className="vehicle-info-label">
                      <span className="vehicle-info-icon">👥</span>
                      Places
                    </div>
                    <div className="vehicle-info-value">{car.seats}</div>
                  </div>

                  <div className="vehicle-info-row">
                    <div className="vehicle-info-label">
                      <span className="vehicle-info-icon">🧳</span>
                      Bagages
                    </div>
                    <div className="vehicle-info-value">{car.luggage}</div>
                  </div>

                  <div className="vehicle-info-row">
                    <div className="vehicle-info-label">
                      <span className="vehicle-info-icon">🛣️</span>
                      Kilométrage actuel
                    </div>
                    <div className="vehicle-info-value">
                      {(car.mileage || 0).toLocaleString("fr-FR")} km
                    </div>
                  </div>

                  <div className="vehicle-info-row">
                    <div className="vehicle-info-label">
                      <span className="vehicle-info-icon">💰</span>
                      Prix / jour
                    </div>
                    <div className="vehicle-info-value">{formatCurrency(car.pricePerDay)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === "operations" && (
            <div className="vehicle-file-grid">
              <div className="vehicle-file-panel">
                <h3>Exploitation</h3>
                <dl className="vehicle-file-list">
                  <div>
                    <dt>Statut</dt>
                    <dd>{car.status}</dd>
                  </div>
                  <div>
                    <dt>Prix journalier</dt>
                    <dd>{formatCurrency(car.pricePerDay)}</dd>
                  </div>
                  <div>
                    <dt>Kilométrage</dt>
                    <dd>{(car.mileage || 0).toLocaleString("fr-FR")} km</dd>
                  </div>
                  <div>
                    <dt>Dernier entretien</dt>
                    <dd>
                      {car.lastMaintenance
                        ? new Date(car.lastMaintenance).toLocaleDateString("fr-FR")
                        : "Non renseigné"}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="vehicle-file-panel">
                <div className="vehicle-file-panel-header">
                  <h3>Blocages</h3>
                  <button className="btn-info" onClick={() => onManageBlocks(car)}>
                    Gérer
                  </button>
                </div>
                {nextBlocks.length === 0 ? (
                  <p className="vehicle-file-empty">Aucun blocage enregistré.</p>
                ) : (
                  <ul className="vehicle-file-timeline">
                    {nextBlocks.map((block) => (
                      <li key={block._id}>
                        <strong>
                          {new Date(block.startDate).toLocaleDateString("fr-FR")} → {" "}
                          {new Date(block.endDate).toLocaleDateString("fr-FR")}
                        </strong>
                        <span>{block.reason || "Indisponibilité temporaire"}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {activeSection === "maintenance" && (
            <div className="vehicle-file-grid">
              <div className="vehicle-file-panel">
                <h3>Résumé {currentYear}</h3>
                <div className="vehicle-file-kpis">
                  <div>
                    <span>Total</span>
                    <strong>{formatCurrency(maintenanceSummary?.totalCost || 0)}</strong>
                  </div>
                  <div>
                    <span>Interventions</span>
                    <strong>{maintenanceSummary?.count || 0}</strong>
                  </div>
                </div>
                {(maintenanceSummary?.byCategory || []).length === 0 ? (
                  <p className="vehicle-file-empty">Aucune dépense cette année.</p>
                ) : (
                  <ul className="vehicle-file-breakdown">
                    {maintenanceSummary.byCategory.map((item) => (
                      <li key={item.category}>
                        <span>{formatMaintenanceCategory(item.category)}</span>
                        <strong>{formatCurrency(item.totalCost)}</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="vehicle-file-panel">
                <h3>Dernières interventions</h3>
                {maintenanceRecords.length === 0 ? (
                  <p className="vehicle-file-empty">Aucun entretien enregistré.</p>
                ) : (
                  <ul className="vehicle-file-timeline">
                    {maintenanceRecords.slice(0, 5).map((record) => (
                      <li key={record._id}>
                        <strong>
                          {formatMaintenanceCategory(record.category)} · {formatCurrency(record.cost)}
                        </strong>
                        <span>
                          {new Date(record.date).toLocaleDateString("fr-FR")}
                          {record.vendor ? ` · ${record.vendor}` : ""}
                        </span>
                        <span>{record.notes || "Aucun détail"}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

// Vue calendrier
function CalendarView({ token }) {
  const [cars, setCars] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [blockedPeriods, setBlockedPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cursorDate, setCursorDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("week"); // day | week | month
  const [selectedCarId, setSelectedCarId] = useState("ALL");
  const [cellModal, setCellModal] = useState(null); // { car, day, reservation, block }
  const [blockDraft, setBlockDraft] = useState({ startDate: "", endDate: "", reason: "" });
  const [savingBlock, setSavingBlock] = useState(false);

  useEffect(() => {
    loadCalendarData();
  }, []);

  async function loadCalendarData() {
    setLoading(true);
    try {
      const [carsRes, reservationsRes] = await Promise.all([
        getAllCars(token),
        getAllReservations(token),
      ]);

      setCars(carsRes);
      setReservations(reservationsRes);

      // Charger tous les blocages en une seule requête (plus rapide)
      const blocksRes = await getAllBlockedPeriods(token).catch(() => []);
      setBlockedPeriods(Array.isArray(blocksRes) ? blocksRes : []);
    } catch (err) {
      alert(err.message || "Erreur lors du chargement du calendrier");
    } finally {
      setLoading(false);
    }
  }

  function getDaysInMonth(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }

    return days;
  }

  function getStartOfWeek(date) {
    const current = new Date(date);
    const day = current.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    current.setDate(current.getDate() + diff);
    current.setHours(0, 0, 0, 0);
    return current;
  }

  function getDaysInWeek(date) {
    const start = getStartOfWeek(date);
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }

  function isDateInRange(date, start, end) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const s = new Date(start);
    s.setHours(0, 0, 0, 0);
    const e = new Date(end);
    e.setHours(0, 0, 0, 0);
    return d >= s && d <= e;
  }

  function getReservationForCarOnDate(carId, date) {
    return reservations.find(
      (r) =>
        r.car?._id === carId &&
        ["PENDING", "CONFIRMED", "ACTIVE"].includes(r.status) &&
        isDateInRange(date, r.startDate, r.endDate)
    );
  }

  function getBlockForCarOnDate(carId, date) {
    return blockedPeriods.find(
      (b) => b.car === carId && isDateInRange(date, b.startDate, b.endDate)
    );
  }

  const days =
    viewMode === "day"
      ? [new Date(cursorDate)]
      : viewMode === "week"
        ? getDaysInWeek(cursorDate)
        : getDaysInMonth(cursorDate);

  function goToPrevious() {
    const previous = new Date(cursorDate);
    if (viewMode === "day") previous.setDate(previous.getDate() - 1);
    else if (viewMode === "week") previous.setDate(previous.getDate() - 7);
    else previous.setMonth(previous.getMonth() - 1);
    setCursorDate(previous);
  }

  function goToNext() {
    const next = new Date(cursorDate);
    if (viewMode === "day") next.setDate(next.getDate() + 1);
    else if (viewMode === "week") next.setDate(next.getDate() + 7);
    else next.setMonth(next.getMonth() + 1);
    setCursorDate(next);
  }

  function goToToday() {
    setCursorDate(new Date());
  }

  if (loading) {
    return <p>Chargement du calendrier...</p>;
  }

  const filteredCars =
    selectedCarId === "ALL" ? cars : cars.filter((c) => String(c?._id) === String(selectedCarId));

  const groupedCars = filteredCars.reduce((accumulator, car) => {
    const key = car.category || "AUTRE";
    if (!accumulator[key]) {
      accumulator[key] = [];
    }
    accumulator[key].push(car);
    return accumulator;
  }, {});

  const categoryOrder = ["CITADINE", "BREAK", "BERLINE", "SUV", "LUXE", "AUTRE"];

  const orderedGroups = categoryOrder
    .filter((category) => groupedCars[category]?.length)
    .map((category) => ({ category, cars: groupedCars[category] }));

  const isToday = (day) => {
    const today = new Date();
    return (
      day.getDate() === today.getDate() &&
      day.getMonth() === today.getMonth() &&
      day.getFullYear() === today.getFullYear()
    );
  };

  const periodLabel =
    viewMode === "day"
      ? cursorDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      : viewMode === "week"
        ? `${days[0]?.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} - ${
            days[days.length - 1]?.toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          }`
        : cursorDate.toLocaleDateString("fr-FR", {
            month: "long",
            year: "numeric",
          });

  const dayForSummary = new Date(cursorDate);
  const summary = (() => {
    const rows = filteredCars.map((car) => {
      const reservation = getReservationForCarOnDate(car._id, dayForSummary);
      const block = getBlockForCarOnDate(car._id, dayForSummary);
      if (block) return "BLOCKED";
      if (reservation) return "RESERVED";
      return "AVAILABLE";
    });
    return {
      total: rows.length,
      available: rows.filter((x) => x === "AVAILABLE").length,
      reserved: rows.filter((x) => x === "RESERVED").length,
      blocked: rows.filter((x) => x === "BLOCKED").length,
    };
  })();

  function toDateInputValue(date) {
    const d = new Date(date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  async function handleCreateBlock(carId) {
    if (!blockDraft.startDate || !blockDraft.endDate) {
      alert("Merci de renseigner les dates.");
      return;
    }
    setSavingBlock(true);
    try {
      await createBlockedPeriod(token, carId, {
        startDate: blockDraft.startDate,
        endDate: blockDraft.endDate,
        reason: blockDraft.reason,
      });
      await loadCalendarData();
      setCellModal(null);
      setBlockDraft({ startDate: "", endDate: "", reason: "" });
    } catch (err) {
      alert(err.message || "Erreur lors du blocage");
    } finally {
      setSavingBlock(false);
    }
  }

  async function handleDeleteBlock(blockId) {
    if (!window.confirm("Supprimer ce blocage ?")) return;
    try {
      await deleteBlockedPeriod(token, blockId);
      await loadCalendarData();
      setCellModal(null);
    } catch (err) {
      alert(err.message || "Erreur lors de la suppression");
    }
  }

  return (
    <div className="calendar-view">
      <div className="calendar-header">
        <div>
          <h2>{periodLabel}</h2>
          <div className="calendar-subtitle">
            Parc: <strong>{summary.available}</strong> disponibles — <strong>{summary.reserved}</strong> réservées —{" "}
            <strong>{summary.blocked}</strong> bloquées (sur la date sélectionnée)
          </div>
        </div>
        <div className="calendar-controls">
          <div className="calendar-mode-switch">
            <button
              className={`btn-calendar ${viewMode === "day" ? "active" : ""}`}
              onClick={() => setViewMode("day")}
            >
              Jour
            </button>
            <button
              className={`btn-calendar ${viewMode === "week" ? "active" : ""}`}
              onClick={() => setViewMode("week")}
            >
              Semaine
            </button>
            <button
              className={`btn-calendar ${viewMode === "month" ? "active" : ""}`}
              onClick={() => setViewMode("month")}
            >
              Mois
            </button>
          </div>
          <div className="calendar-filters">
            <select
              className="calendar-select"
              value={selectedCarId}
              onChange={(e) => setSelectedCarId(e.target.value)}
              title="Filtrer par véhicule"
            >
              <option value="ALL">Tous les véhicules</option>
              {cars.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.brand} {c.model} — {c.licensePlate}
                </option>
              ))}
            </select>
          </div>
          <button className="btn-calendar" onClick={goToPrevious}>
            ◀ Précédent
          </button>
          <button className="btn-calendar" onClick={goToToday}>
            Aujourd'hui
          </button>
          <button className="btn-calendar" onClick={goToNext}>
            Suivant ▶
          </button>
        </div>
      </div>

      <div className="calendar-legend">
        <div className="legend-item">
          <div className="legend-color pending"></div>
          <span>En attente</span>
        </div>
        <div className="legend-item">
          <div className="legend-color confirmed"></div>
          <span>Confirmée</span>
        </div>
        <div className="legend-item">
          <div className="legend-color active"></div>
          <span>Active</span>
        </div>
        <div className="legend-item">
          <div className="legend-color blocked"></div>
          <span>Bloquée</span>
        </div>
      </div>

      <div className="calendar-grid-container">
        <table className="calendar-table">
          <thead>
            <tr>
              <th className="car-column">Voiture</th>
              {days.map((day, i) => (
                <th key={i} className={`day-column ${isToday(day) ? "today-column" : ""}`}>
                  <div className="day-header">
                    <div className="day-name">
                      {day.toLocaleDateString("fr-FR", { weekday: "short" })}
                    </div>
                    <div className="day-number">{day.getDate()}</div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orderedGroups.map((group) => (
              <Fragment key={`group-${group.category}`}>
                <tr key={`group-${group.category}`} className="calendar-group-row">
                  <td className="car-column group-title">{group.category}</td>
                  {days.map((_, index) => (
                    <td key={index} className="calendar-group-spacer"></td>
                  ))}
                </tr>
                {group.cars.map((car) => (
                  <tr key={car._id}>
                    <td className="car-column">
                      <div className="car-name">
                        <strong>{car.brand} {car.model}</strong>
                        <br />
                        <small>{car.licensePlate}</small>
                      </div>
                    </td>
                    {days.map((day, i) => {
                      const reservation = getReservationForCarOnDate(car._id, day);
                      const block = getBlockForCarOnDate(car._id, day);

                      let className = `calendar-cell ${isToday(day) ? "today-cell" : ""}`;
                      let title = "";

                      if (block) {
                        className += " blocked";
                        title = `Bloquée: ${block.reason}`;
                      } else if (reservation) {
                        className += ` ${reservation.status.toLowerCase()}`;
                        title = `${reservation.user?.firstName || "Client"} ${reservation.user?.lastName || ""}`;
                      }

                      const isReservationStart =
                        reservation &&
                        new Date(reservation.startDate).toDateString() === day.toDateString();

                      return (
                        <td
                          key={i}
                          className={className}
                          title={title}
                          onClick={() => {
                            setCellModal({ car, day, reservation, block });
                            setBlockDraft({
                              startDate: toDateInputValue(day),
                              endDate: toDateInputValue(day),
                              reason: "",
                            });
                          }}
                          style={{ cursor: "pointer" }}
                        >
                          {reservation && (
                            <div className="reservation-marker">
                              {isReservationStart ? (
                                <span className="reservation-chip">
                                  {(reservation.user?.firstName || "Client").slice(0, 8)}
                                </span>
                              ) : (
                                <span className="reservation-dot" />
                              )}
                            </div>
                          )}
                          {block && <div className="block-marker">🔒</div>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {cellModal && (
        <div
          className="admin-modal-backdrop"
          role="presentation"
          onMouseDown={(e) => e.target === e.currentTarget && setCellModal(null)}
        >
          <div className="admin-modal" role="dialog" aria-modal="true" style={{ width: "min(760px, 100%)" }}>
            <div className="admin-modal-top">
              <div className="admin-modal-title">
                {cellModal.car?.brand} {cellModal.car?.model} —{" "}
                {new Date(cellModal.day).toLocaleDateString("fr-FR")}
              </div>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setCellModal(null)}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
            <div className="admin-modal-body">
              {cellModal.block ? (
                <div className="calendar-cell-modal">
                  <div className="calendar-cell-modal-title">Créneau bloqué</div>
                  <div className="calendar-cell-modal-row">
                    <strong>Période</strong>
                    <span>
                      {new Date(cellModal.block.startDate).toLocaleDateString("fr-FR")} →{" "}
                      {new Date(cellModal.block.endDate).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                  <div className="calendar-cell-modal-row">
                    <strong>Raison</strong>
                    <span>{cellModal.block.reason || "Indisponibilité temporaire"}</span>
                  </div>
                  <div className="calendar-cell-modal-actions">
                    <button type="button" className="btn-deactivate" onClick={() => handleDeleteBlock(cellModal.block._id)}>
                      Supprimer le blocage
                    </button>
                  </div>
                </div>
              ) : cellModal.reservation ? (
                <div className="calendar-cell-modal">
                  <div className="calendar-cell-modal-title">Réservation</div>
                  <div className="calendar-cell-modal-row">
                    <strong>Client</strong>
                    <span>
                      {cellModal.reservation.user
                        ? `${cellModal.reservation.user.firstName || ""} ${cellModal.reservation.user.lastName || ""}`.trim() ||
                          cellModal.reservation.user.email
                        : "Client"}
                    </span>
                  </div>
                  <div className="calendar-cell-modal-row">
                    <strong>Statut</strong>
                    <span>{cellModal.reservation.status}</span>
                  </div>
                  <div className="calendar-cell-modal-row">
                    <strong>Période</strong>
                    <span>
                      {new Date(cellModal.reservation.startDate).toLocaleDateString("fr-FR")} →{" "}
                      {new Date(cellModal.reservation.endDate).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                  <div className="calendar-cell-modal-hint">
                    Ce créneau est déjà occupé: le système empêchera automatiquement les réservations en conflit.
                  </div>
                </div>
              ) : (
                <div className="calendar-cell-modal">
                  <div className="calendar-cell-modal-title">Bloquer un créneau</div>
                  <div className="calendar-cell-modal-hint">
                    Utilise ça pour marquer un véhicule indisponible (panne, sinistre, entretien, etc.).
                  </div>
                  <div className="calendar-block-form">
                    <div className="calendar-block-row">
                      <div className="calendar-block-field">
                        <label>Date début</label>
                        <input
                          type="date"
                          value={blockDraft.startDate}
                          onChange={(e) => setBlockDraft((p) => ({ ...p, startDate: e.target.value }))}
                        />
                      </div>
                      <div className="calendar-block-field">
                        <label>Date fin</label>
                        <input
                          type="date"
                          value={blockDraft.endDate}
                          onChange={(e) => setBlockDraft((p) => ({ ...p, endDate: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="calendar-block-field">
                      <label>Raison</label>
                      <input
                        type="text"
                        placeholder="Ex: Entretien, panne, sinistre…"
                        value={blockDraft.reason}
                        onChange={(e) => setBlockDraft((p) => ({ ...p, reason: e.target.value }))}
                      />
                    </div>
                    <div className="calendar-cell-modal-actions">
                      <button
                        type="button"
                        className="btn-approve"
                        disabled={savingBlock}
                        onClick={() => handleCreateBlock(cellModal.car._id)}
                      >
                        Bloquer
                      </button>
                      <button type="button" className="btn-calendar" onClick={() => setCellModal(null)}>
                        Annuler
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
