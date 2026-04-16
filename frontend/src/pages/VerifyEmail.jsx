import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import { verifyEmail } from "../api/auth.js";
import { useAuth } from "../context/AuthContext.jsx";
import "./Auth.css";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loading: authLoading } = useAuth();
  const token = searchParams.get("token") || "";
  const [status, setStatus] = useState("loading"); // loading | ok | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;
    if (!token) {
      Promise.resolve().then(() => {
        if (!mounted) return;
        setStatus("error");
        setMessage("Lien de vérification invalide.");
      });
      return undefined;
    }

    verifyEmail(token)
      .then(() => {
        if (!mounted) return;
        setStatus("ok");
        setMessage("Adresse email confirmée. Vous êtes connecté.");
        setTimeout(() => navigate("/"), 800);
      })
      .catch((err) => {
        if (!mounted) return;
        setStatus("error");
        setMessage(err?.message || "Lien expiré ou invalide.");
      });

    return () => {
      mounted = false;
    };
  }, [navigate, token]);

  return (
    <>
      <Navbar />
      <div className="auth-page">
        <div className="auth-card">
          <h1>Confirmation email</h1>
          {status === "loading" || authLoading ? (
            <div className="auth-success">Vérification en cours…</div>
          ) : status === "ok" ? (
            <div className="auth-success">{message}</div>
          ) : (
            <div className="auth-error">{message}</div>
          )}

          <p className="auth-footer">
            <Link to="/login">Aller à la connexion</Link>
          </p>
        </div>
      </div>
      <Footer />
    </>
  );
}

