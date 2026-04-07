// src/components/Navbar.jsx
import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Navbar.css";
import { useAppContext } from "../context/AppContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Navbar() {
  const { currency, setCurrency, language, setLanguage } = useAppContext();
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [localeModalOpen, setLocaleModalOpen] = useState(false);
  const [localeTab, setLocaleTab] = useState("language");
  const isAdminPage = location.pathname.startsWith("/admin");
  const logoTarget = user?.isAdmin ? "/admin" : "/";

  const languageLabel = language === "fr" ? "Français" : "English";
  const currencyLabel = currency === "EUR" ? "Euro (€)" : "Dollar ($)";

  const accountTarget = useMemo(() => {
    if (isAuthenticated) return "/profile";
    return "/login";
  }, [isAuthenticated]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="navbar">
      {/* Logo */}
      <div className="navbar-left">
        <Link to={logoTarget} className="navbar-logo-link">
          <span className="navbar-logo-mark">
            <img
              src="/logo.png"
              alt="IonyKar"
              className="navbar-logo-img"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          </span>
        </Link>
      </div>

      <nav className="navbar-nav" aria-label="Navigation principale">
        <Link to="/" className="navbar-nav-link">
          {language === "fr" ? "Accueil" : "Home"}
        </Link>
        <Link to="/cars" className="navbar-nav-link">
          {language === "fr" ? "Nos Véhicules" : "Vehicles"}
        </Link>
        <Link to="/stations" className="navbar-nav-link">
          {language === "fr" ? "Nos Stations" : "Stations"}
        </Link>
      </nav>

      {/* Droite : langue, monnaie, connexion, inscription */}
      <div className="navbar-right">
        <Link to="/cars" className="navbar-reserve">
          {language === "fr" ? "Réserver" : "Book"}
        </Link>

        <button
          type="button"
          className="locale-trigger"
          onClick={() => setLocaleModalOpen(true)}
        >
          <span>{languageLabel}</span>
          <span className="locale-trigger-separator">|</span>
          <span>{currencyLabel}</span>
        </button>

        {/* Auth */}
        {isAuthenticated ? (
          <>
            <div
              className={`profile-menu-wrapper ${menuOpen ? "open" : ""}`}
              onMouseEnter={() => setMenuOpen(true)}
              onMouseLeave={() => setMenuOpen(false)}
            >
              <button
                className="profile-menu-trigger"
                onClick={() => setMenuOpen((prev) => !prev)}
                type="button"
              >
                <span className="profile-avatar">👤</span>
                <span className="profile-name">{user?.firstName || "User"}</span>
                <span className="profile-chevron">▾</span>
              </button>

              <div className="profile-dropdown">
                {!isAdminPage && (
                  <Link to="/my-reservations" className="profile-dropdown-item">
                    {language === "fr" ? "Mes réservations" : "My reservations"}
                  </Link>
                )}
                <Link to="/profile" className="profile-dropdown-item">
                  {language === "fr" ? "Mon profil" : "My profile"}
                </Link>
                {user?.isAdmin && !isAdminPage && (
                  <Link to="/admin" className="profile-dropdown-item profile-dropdown-item-admin">
                    {language === "fr" ? "Espace admin" : "Admin area"}
                  </Link>
                )}
                <button onClick={handleLogout} className="profile-dropdown-item profile-logout-button" type="button">
                  {language === "fr" ? "Se déconnecter" : "Logout"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <Link to="/login" className="navbar-link">
              {language === "fr" ? "Connexion" : "Log in"}
            </Link>
            <Link to="/signup" className="navbar-button">
              {language === "fr" ? "Inscription" : "Sign up"}
            </Link>
          </>
        )}
      </div>

      {localeModalOpen && (
        <div
          className="locale-modal-overlay"
          onClick={() => setLocaleModalOpen(false)}
          role="presentation"
        >
          <div className="locale-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="locale-modal-close"
              onClick={() => setLocaleModalOpen(false)}
              aria-label={language === "fr" ? "Fermer" : "Close"}
            >
              ×
            </button>

            <div className="locale-modal-tabs" role="tablist">
              <button
                type="button"
                className={`locale-tab ${localeTab === "language" ? "active" : ""}`}
                onClick={() => setLocaleTab("language")}
              >
                {language === "fr" ? "Langues et régions" : "Languages and regions"}
              </button>
              <button
                type="button"
                className={`locale-tab ${localeTab === "currency" ? "active" : ""}`}
                onClick={() => setLocaleTab("currency")}
              >
                {language === "fr" ? "Devise" : "Currency"}
              </button>
            </div>

            {localeTab === "language" ? (
              <div className="locale-grid" role="list">
                <button
                  type="button"
                  className={`locale-option ${language === "fr" ? "selected" : ""}`}
                  onClick={() => setLanguage("fr")}
                >
                  <span className="locale-option-title">Français</span>
                  <span className="locale-option-subtitle">France</span>
                </button>
                <button
                  type="button"
                  className={`locale-option ${language === "en" ? "selected" : ""}`}
                  onClick={() => setLanguage("en")}
                >
                  <span className="locale-option-title">English</span>
                  <span className="locale-option-subtitle">United States</span>
                </button>
              </div>
            ) : (
              <div className="locale-grid" role="list">
                <button
                  type="button"
                  className={`locale-option ${currency === "EUR" ? "selected" : ""}`}
                  onClick={() => setCurrency("EUR")}
                >
                  <span className="locale-option-title">Euro (€)</span>
                  <span className="locale-option-subtitle">EUR</span>
                </button>
                <button
                  type="button"
                  className={`locale-option ${currency === "USD" ? "selected" : ""}`}
                  onClick={() => setCurrency("USD")}
                >
                  <span className="locale-option-title">Dollar ($)</span>
                  <span className="locale-option-subtitle">USD</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
