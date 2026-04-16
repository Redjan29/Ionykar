import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import { forgotPassword } from "../api/auth.js";
import "./Auth.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await forgotPassword(email);
      setDone(true);
    } catch (err) {
      setError(err?.message || "Erreur, veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />
      <div className="auth-page">
        <div className="auth-card">
          <h1>Mot de passe oublié</h1>

          {done ? (
            <div className="auth-success">
              Si un compte existe pour cet email, un lien de réinitialisation vient d’être envoyé.
            </div>
          ) : null}

          {error ? <div className="auth-error">{error}</div> : null}

          {!done ? (
            <form onSubmit={handleSubmit} className="auth-form">
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </label>
              <button type="submit" className="auth-button" disabled={loading}>
                {loading ? "Envoi..." : "Envoyer le lien"}
              </button>
            </form>
          ) : null}

          <p className="auth-footer">
            <Link to="/login">Retour à la connexion</Link>
          </p>
        </div>
      </div>
      <Footer />
    </>
  );
}

