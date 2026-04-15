import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "./NotFound.css";

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="notfound">
        <div className="notfound-card">
          <h1>Page introuvable</h1>
          <p>La page que vous cherchez n’existe pas ou a été déplacée.</p>
          <div className="notfound-actions">
            <Link to="/" className="notfound-primary">
              Retour à l’accueil
            </Link>
            <Link to="/cars" className="notfound-secondary">
              Voir les voitures
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

