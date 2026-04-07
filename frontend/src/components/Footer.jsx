import { Link } from "react-router-dom";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="ik-footer">
      <div className="ik-footer-inner">
        <div className="ik-footer-brand">
          <div className="ik-footer-logo-row">
            <img
              src="/logo.png"
              alt="IonyKar"
              className="ik-footer-logo"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
            <span className="ik-footer-brand-name">IonyKar</span>
          </div>
          <p className="ik-footer-tagline">
            Location de voitures courte et longue durée — Paris 12e (Bastille).
          </p>
        </div>

        <nav className="ik-footer-links" aria-label="Liens du footer">
          <div className="ik-footer-links-col">
            <div className="ik-footer-links-title">Informations</div>
            <Link to="/cgl" className="ik-footer-link">
              Conditions Générales de Location (CGL)
            </Link>
            <Link to="/mentions-legales" className="ik-footer-link">
              Mentions légales
            </Link>
            <Link to="/politique-confidentialite" className="ik-footer-link">
              Politique de confidentialité
            </Link>
          </div>

          <div className="ik-footer-links-col">
            <div className="ik-footer-links-title">Contact</div>
            <a className="ik-footer-link" href="mailto:contact@ionykar.fr">
              contact@ionykar.fr
            </a>
            <a className="ik-footer-link" href="tel:+33612193050">
              +33 6 12 19 30 50
            </a>
            <span className="ik-footer-muted">Paris 12e — Bastille</span>
          </div>
        </nav>
      </div>

      <div className="ik-footer-bottom">
        <span>© {new Date().getFullYear()} IonyKar SAS — Tous droits réservés</span>
        <span className="ik-footer-bottom-sep">•</span>
        <span>Site 100% digital, réservation 24/7</span>
      </div>
    </footer>
  );
}

