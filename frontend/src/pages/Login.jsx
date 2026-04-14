// src/pages/Login.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import { useAppContext } from "../context/AppContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import "./Auth.css";

export default function Login() {
  const { language } = useAppContext();
  const { login } = useAuth();
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
    email: "",
    password: "",
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

    try {
      const loggedUser = await login(formData.email, formData.password);
      navigate(loggedUser?.isAdmin ? "/admin" : "/");
    } catch (err) {
      setError(
        err.message ||
          (language === "fr"
            ? "Email ou mot de passe incorrect"
            : "Invalid email or password")
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
          <h1>{language === "fr" ? "Connexion" : "Log in"}</h1>
          
          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
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
              {language === "fr" ? "Mot de passe" : "Password"}
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={loading}
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
            <button type="submit" className="auth-button" disabled={loading}>
              {loading
                ? language === "fr"
                  ? "Connexion..."
                  : "Logging in..."
                : language === "fr"
                ? "Se connecter"
                : "Log in"}
            </button>
          </form>

          <p className="auth-footer">
            {language === "fr"
              ? "Pas encore de compte ? "
              : "Don't have an account? "}
            <Link to="/signup">
              {language === "fr" ? "Créer un compte" : "Sign up"}
            </Link>
          </p>
        </div>
      </div>
      <Footer />
    </>
  );
}
