// src/pages/Signup.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import { useAppContext } from "../context/AppContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import "./Auth.css";

export default function Signup() {
  const { language } = useAppContext();
  const { register } = useAuth();
  const navigate = useNavigate();

  const EyeIcon = ({ off = false }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M12 15.2a3.2 3.2 0 1 0-3.2-3.2A3.2 3.2 0 0 0 12 15.2Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      {off ? (
        <path
          d="M4 20 20 4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      ) : null}
    </svg>
  );

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [consents, setConsents] = useState({
    marketing: false,
    cgl: false,
    privacy: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setError("");
  };

  const toggleConsent = (key) => {
    setConsents((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const hasRequiredConsents = Boolean(consents.cgl && consents.privacy);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasRequiredConsents) {
      setError(
        language === "fr"
          ? "Veuillez accepter les Conditions générales et la Politique de confidentialité."
          : "Please accept the Terms and the Privacy policy."
      );
      return;
    }
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
      navigate("/login");
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

          <div className="auth-success" style={{ marginBottom: 12 }}>
            {language === "fr"
              ? "Après inscription, vous devrez confirmer votre email."
              : "After signing up, you will need to verify your email."}
          </div>

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
                  {showPassword ? <EyeIcon off /> : <EyeIcon />}
                </button>
              </div>
            </label>

            <div className="auth-consents" role="group" aria-label="Consentements">
              <label className="auth-consent">
                <input
                  type="checkbox"
                  checked={consents.marketing}
                  onChange={() => toggleConsent("marketing")}
                  disabled={loading}
                />
                <span>
                  {language === "fr"
                    ? "J'accepte de recevoir des communications (optionnel)"
                    : "I agree to receive communications (optional)"}
                </span>
              </label>

              <label className="auth-consent">
                <input
                  type="checkbox"
                  checked={consents.cgl}
                  onChange={() => toggleConsent("cgl")}
                  disabled={loading}
                />
                <span>
                  {language === "fr" ? "J'ai lu et j'accepte les " : "I have read and accept the "}
                  <Link className="auth-consent-link" to="/cgl" target="_blank" rel="noreferrer">
                    {language === "fr" ? "Conditions générales" : "Terms"}
                  </Link>
                </span>
                <span className="auth-consent-required">{language === "fr" ? "(obligatoire)" : "(required)"}</span>
              </label>

              <label className="auth-consent">
                <input
                  type="checkbox"
                  checked={consents.privacy}
                  onChange={() => toggleConsent("privacy")}
                  disabled={loading}
                />
                <span>
                  {language === "fr" ? "J'ai lu et j'accepte la " : "I have read and accept the "}
                  <Link className="auth-consent-link" to="/politique-confidentialite" target="_blank" rel="noreferrer">
                    {language === "fr" ? "politique de confidentialité" : "privacy policy"}
                  </Link>
                </span>
                <span className="auth-consent-required">{language === "fr" ? "(obligatoire)" : "(required)"}</span>
              </label>
            </div>
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
      <Footer />
    </>
  );
}
