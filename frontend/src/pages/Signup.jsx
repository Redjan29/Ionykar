// src/pages/Signup.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import { useAppContext } from "../context/AppContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import "./Auth.css";

export default function Signup() {
  const { language } = useAppContext();
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validation alignée avec le backend
    if (formData.password.length < 8) {
      setError(
        language === "fr"
          ? "Le mot de passe doit contenir au moins 8 caractères"
          : "Password must be at least 8 characters"
      );
      setLoading(false);
      return;
    }

    if (!/\d/.test(formData.password)) {
      setError(
        language === "fr"
          ? "Le mot de passe doit contenir au moins un chiffre"
          : "Password must contain at least one number"
      );
      setLoading(false);
      return;
    }

    try {
      await register(formData);
      navigate("/");
    } catch (err) {
      setError(
        err.message ||
          (language === "fr"
            ? "Erreur lors de la création du compte"
            : "Error creating account")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="auth-page">
        <div className="auth-card">
          <h1>{language === "fr" ? "Inscription" : "Sign up"}</h1>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <label>
              {language === "fr" ? "Prénom" : "First name"}
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </label>
            <label>
              {language === "fr" ? "Nom" : "Last name"}
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </label>
            <label>
              Email
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </label>
            <label>
              {language === "fr" ? "Téléphone" : "Phone"}
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </label>
            <label>
              {language === "fr" ? "Mot de passe" : "Password"}
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  minLength={8}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={
                    showPassword
                      ? language === "fr"
                        ? "Masquer le mot de passe"
                        : "Hide password"
                      : language === "fr"
                      ? "Afficher le mot de passe"
                      : "Show password"
                  }
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
            </label>
            <button type="submit" className="auth-button" disabled={loading}>
              {loading
                ? language === "fr"
                  ? "Création..."
                  : "Creating..."
                : language === "fr"
                ? "Créer un compte"
                : "Create account"}
            </button>
          </form>

          <p className="auth-footer">
            {language === "fr"
              ? "Déjà inscrit ? "
              : "Already have an account? "}
            <Link to="/login">
              {language === "fr" ? "Se connecter" : "Log in"}
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
