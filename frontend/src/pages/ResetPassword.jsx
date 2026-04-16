import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import { resetPassword } from "../api/auth.js";
import "./Auth.css";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!token) {
      setError("Lien invalide.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate("/login"), 800);
    } catch (err) {
      setError(err?.message || "Impossible de réinitialiser le mot de passe.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />
      <div className="auth-page">
        <div className="auth-card">
          <h1>Réinitialiser le mot de passe</h1>

          {done ? <div className="auth-success">Mot de passe mis à jour. Redirection…</div> : null}
          {error ? <div className="auth-error">{error}</div> : null}

          {!done ? (
            <form onSubmit={handleSubmit} className="auth-form">
              <label>
                Nouveau mot de passe
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                  disabled={loading}
                />
              </label>
              <button type="submit" className="auth-button" disabled={loading}>
                {loading ? "Mise à jour..." : "Mettre à jour"}
              </button>
            </form>
          ) : null}

          <p className="auth-footer">
            <Link to="/login">Aller à la connexion</Link>
          </p>
        </div>
      </div>
      <Footer />
    </>
  );
}

