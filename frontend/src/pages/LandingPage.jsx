// src/pages/LandingPage.jsx
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchCars } from "../api/cars";
import CarCard from "../components/CarCard";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import BackToTop from "../components/BackToTop.jsx";
import "./LandingPage.css";

export default function LandingPage() {
  const [featuredCars, setFeaturedCars] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Dates par défaut : aujourd'hui + 3 jours
  const today = new Date();
  const threeDaysLater = new Date(today);
  threeDaysLater.setDate(today.getDate() + 3);
  
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const [searchParams, setSearchParams] = useState({
    startDate: formatDate(today),
    startTime: "09:00",
    endDate: formatDate(threeDaysLater),
    endTime: "18:00",
  });

  useEffect(() => {
    const loadFeaturedCars = async () => {
      try {
        const data = await fetchCars();
        // Prendre 3 voitures aléatoires pour la section "Notre flotte"
        const featured = data.sort(() => 0.5 - Math.random()).slice(0, 3);
        setFeaturedCars(featured);
      } catch (error) {
        console.error("Erreur chargement voitures:", error);
      } finally {
        setLoading(false);
      }
    };
    loadFeaturedCars();
  }, []);
  
  // Fonction pour construire l'URL avec les dates
  const buildUrlWithDates = (basePath) => {
    const params = new URLSearchParams({
      startDate: searchParams.startDate,
      startTime: searchParams.startTime,
      endDate: searchParams.endDate,
      endTime: searchParams.endTime,
    });
    return `${basePath}?${params.toString()}`;
  };
  
  const handleSearchChange = (e) => {
    const { name, value } = e.target;
    setSearchParams(prev => ({ ...prev, [name]: value }));
  };
  
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute of ['00', '30']) {
        const time = `${String(hour).padStart(2, '0')}:${minute}`;
        options.push(
          <option key={time} value={time}>
            {time}
          </option>
        );
      }
    }
    return options;
  };
  
  const handleSearch = async () => {
    if (!searchParams.startDate || !searchParams.endDate) {
      alert("Veuillez choisir des dates de départ et de retour");
      return;
    }
    
    const start = new Date(searchParams.startDate);
    const end = new Date(searchParams.endDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Reset time to start of day
    
    // Vérifier que la date de départ n'est pas dans le passé
    if (start < now) {
      alert("La date de départ ne peut pas être antérieure à aujourd'hui");
      return;
    }
    
    // Vérifier que la date de retour n'est pas dans le passé
    if (end < now) {
      alert("La date de retour ne peut pas être antérieure à aujourd'hui");
      return;
    }
    
    if (start >= end) {
      alert("La date de retour doit être après la date de départ");
      return;
    }
    
    setSearching(true);
    setHasSearched(true);
    
    try {
      const data = await fetchCars({
        startDate: searchParams.startDate,
        endDate: searchParams.endDate,
      });
      setSearchResults(data);
      
      // Scroll vers les résultats
      setTimeout(() => {
        document.getElementById('search-results')?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);
    } catch (error) {
      console.error("Erreur recherche:", error);
      alert(error.message || "Erreur lors de la recherche. Veuillez réessayer.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>Louez une voiture en quelques clics — 24h/24 et 7j/7</h1>
          <p className="hero-subtitle">
            Réservez votre véhicule en ligne en toute autonomie, au départ de Paris 12e
            (Bastille). Paiement sécurisé et documents contractuels automatisés.
          </p>
          
          {/* Barre de recherche */}
          <div className="search-bar-container">
            <div className="search-bar">
              <div className="search-field">
                <label>Date de départ</label>
                <input
                  type="date"
                  name="startDate"
                  value={searchParams.startDate}
                  onChange={handleSearchChange}
                  min={formatDate(today)}
                />
              </div>
              
              <div className="search-field">
                <label>Heure de départ</label>
                <select
                  name="startTime"
                  value={searchParams.startTime}
                  onChange={handleSearchChange}
                >
                  {generateTimeOptions()}
                </select>
              </div>
              
              <div className="search-field">
                <label>Date de retour</label>
                <input
                  type="date"
                  name="endDate"
                  value={searchParams.endDate}
                  onChange={handleSearchChange}
                  min={searchParams.startDate || formatDate(today)}
                />
              </div>
              
              <div className="search-field">
                <label>Heure de retour</label>
                <select
                  name="endTime"
                  value={searchParams.endTime}
                  onChange={handleSearchChange}
                >
                  {generateTimeOptions()}
                </select>
              </div>
              
              <button 
                className="search-button"
                onClick={handleSearch}
                disabled={searching}
              >
                {searching ? "Recherche..." : "🔍 Rechercher"}
              </button>
            </div>
          </div>
          
          <div className="hero-cta">
            <Link to={buildUrlWithDates("/cars")} className="btn-primary">
              Voir nos voitures disponibles
            </Link>
            <a href="#comment-ca-marche" className="btn-secondary">
              Comment ça marche ?
            </a>
            <a href="#contact" className="btn-secondary">
              Nous contacter
            </a>
          </div>
          <div className="hero-features">
            <div className="feature-badge">
              <span className="icon">✓</span>
              <span>Sans frais cachés</span>
            </div>
            <div className="feature-badge">
              <span className="icon">✓</span>
              <span>Annulation gratuite</span>
            </div>
            <div className="feature-badge">
              <span className="icon">✓</span>
              <span>Support client 24/7</span>
            </div>
          </div>
        </div>
      </section>

      {/* Résultats de recherche */}
      {hasSearched && (
        <section id="search-results" className="search-results-section">
          <div className="container">
            <h2>
              {searchResults.length} voiture{searchResults.length > 1 ? 's' : ''} trouvée{searchResults.length > 1 ? 's' : ''} du {new Date(searchParams.startDate).toLocaleDateString('fr-FR')} au {new Date(searchParams.endDate).toLocaleDateString('fr-FR')}
            </h2>
            
            {searching ? (
              <p>Chargement...</p>
            ) : searchResults.length === 0 ? (
              <p>Aucune voiture trouvée pour ces dates.</p>
            ) : (
              <div className="search-results-grid">
                {searchResults.map((car) => (
                  <CarCard key={car._id} {...car} searchParams={searchParams} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Pourquoi IonyKar */}
      <section className="why-section">
        <div className="container">
          <h2>Pourquoi choisir IonyKar pour votre location de voiture ?</h2>
          <p className="section-intro">
            IonyKar vous propose une expérience 100% digitale : réservation en ligne,
            assistance 24/7 et véhicules assurés tous risques.
          </p>
          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="benefit-icon">💰</div>
              <h3>Prix transparents et compétitifs</h3>
              <p>
                Nos tarifs de location de voiture sont parmi les plus bas du marché.
                Aucun frais caché, aucune surprise à la restitution. Le prix affiché
                est le prix final pour louer votre véhicule.
              </p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">🚗</div>
              <h3>Large choix de véhicules</h3>
              <p>
                Citadines économiques, berlines familiales, SUV spacieux ou voitures
                de luxe : notre flotte répond à tous vos besoins de location. Tous nos
                véhicules sont récents, entretenus et assurés.
              </p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">⚡</div>
              <h3>Réservation instantanée en ligne</h3>
              <p>
                Réservez votre voiture de location en quelques clics depuis notre site
                web. Confirmation immédiate par email, modification et annulation
                gratuites jusqu'à 24h avant votre location.
              </p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">🛡️</div>
              <h3>Assurance tous risques incluse</h3>
              <p>
                Tous nos véhicules sont assurés tous risques avec assistance 24h/24
                et 7j/7.
              </p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">📍</div>
              <h3>Stations à Paris 12e (Bastille)</h3>
              <p>
                Retrait et retour simplifiés depuis nos stations d'autopartage à Paris
                12e.
              </p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">👥</div>
              <h3>Support client dédié</h3>
              <p>
                Notre équipe est disponible 7j/7 pour vous accompagner dans votre
                location de voiture. Assistance téléphonique, chat en ligne et email
                pour répondre à toutes vos questions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section id="comment-ca-marche" className="how-it-works">
        <div className="container">
          <h2>Comment louer une voiture avec IonyKar en 4 étapes</h2>
          <p className="section-intro">
            La location de voiture n'a jamais été aussi simple. Suivez notre processus
            rapide et sécurisé pour réserver votre véhicule en quelques minutes.
          </p>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3>Choisissez votre voiture</h3>
              <p>
                Parcourez notre catalogue de voitures disponibles. Filtrez par
                catégorie, prix ou équipements pour trouver le véhicule parfait pour
                votre location. Comparez les modèles et consultez les
                caractéristiques détaillées.
              </p>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <h3>Sélectionnez vos dates</h3>
              <p>
                Indiquez la période de votre location de voiture : date et heure de
                départ, date et heure de retour. Notre système vérifie instantanément
                la disponibilité et calcule le tarif exact pour votre réservation.
              </p>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <h3>Créez votre compte</h3>
              <p>
                Inscrivez-vous gratuitement en quelques secondes. Renseignez vos
                informations de permis de conduire. Votre compte vous permet de gérer
                toutes vos locations de voiture et de bénéficier de nos offres
                exclusives.
              </p>
            </div>
            <div className="step-card">
              <div className="step-number">4</div>
              <h3>Récupérez votre véhicule</h3>
              <p>
                Présentez-vous au point de retrait avec votre permis de conduire et
                votre pièce d'identité. Votre voiture de location vous attend, propre,
                avec le plein fait et prête à prendre la route immédiatement.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Notre flotte */}
      {/* (sections "Notre flotte" et "Témoignages" retirées à ta demande) */}

      {/* Nos véhicules (aperçu) */}
      <section className="vehicles-preview-section">
        <div className="container">
          <div className="section-header-row">
            <div>
              <h2>Nos véhicules</h2>
              <p className="section-intro">
                Un aperçu de véhicules disponibles. Consultez chaque fiche pour voir les
                caractéristiques et réserver.
              </p>
            </div>
            <Link to={buildUrlWithDates("/cars")} className="btn-primary btn-primary-compact">
              Voir tous les véhicules
            </Link>
          </div>

          {!loading && featuredCars.length > 0 ? (
            <div className="vehicles-preview-grid">
              {featuredCars.slice(0, 4).map((car) => (
                <CarCard key={car._id || car.slug} {...car} searchParams={searchParams} />
              ))}
            </div>
          ) : (
            <div className="vehicles-preview-empty">
              {loading ? "Chargement..." : "Aucun véhicule à afficher pour le moment."}
            </div>
          )}
        </div>
      </section>

      {/* Nos stations (carte + liste) */}
      <section className="stations-home-section">
        <div className="container">
          <div className="section-header-row">
            <div>
              <h2>Nos stations</h2>
              <p className="section-intro">
                Retrait et retour depuis nos stations à Paris 12e (Bastille).
              </p>
            </div>
            <Link to="/stations" className="btn-secondary btn-secondary-compact">
              Voir les stations
            </Link>
          </div>

          <div className="stations-grid">
            <div className="stations-map">
              <iframe
                title="Carte des stations IonyKar"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src="https://www.google.com/maps?q=Bastille%20Paris%2012&output=embed"
              />
            </div>

            <div className="stations-list">
              <div className="station-card">
                <div className="station-card-title">Paris 12e — Bastille</div>
                <div className="station-card-meta">Station principale</div>
                <div className="station-card-line">Accès facile, informations envoyées avant départ.</div>
              </div>
              <div className="station-card station-card-muted">
                <div className="station-card-title">Autres stations</div>
                <div className="station-card-line">
                  À venir: ajout des stations d’autopartage sur la carte et sur la page dédiée.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SEO-rich */}
      <section className="faq-section">
        <div className="container">
          <h2>Questions fréquentes sur la location de voiture</h2>
          <div className="faq-grid">
            <div className="faq-item">
              <h3>Quel est le prix moyen d'une location de voiture ?</h3>
              <p>
                Le prix d'une location varie selon le véhicule et la période.
                Le tarif affiché est calculé automatiquement pour vos dates.
              </p>
            </div>
            <div className="faq-item">
              <h3>Quelles sont les conditions pour louer une voiture ?</h3>
              <p>
                Pour louer un véhicule, vous devez avoir au minimum 21 ans, être
                titulaire d'un permis de conduire depuis au moins 3 ans, et fournir
                les documents demandés lors de la création du compte.
              </p>
            </div>
            <div className="faq-item">
              <h3>Puis-je annuler ma réservation de location de voiture ?</h3>
              <p>
                Oui, l'annulation de votre location de voiture est gratuite jusqu'à 24
                heures avant la date de départ prévue. Vous pouvez modifier ou annuler
                votre réservation directement depuis votre compte client ou en
                contactant notre service support.
              </p>
            </div>
            <div className="faq-item">
              <h3>L'assurance est-elle incluse dans le prix de location ?</h3>
              <p>
                Absolument ! Toutes nos locations de voiture incluent une assurance
                tous risques complète sans franchise. Vous êtes couvert pour les
                dommages au véhicule, le vol, le bris de glace et la responsabilité
                civile. Roulez en toute sérénité.
              </p>
            </div>
            <div className="faq-item">
              <h3>Où puis-je récupérer ma voiture de location ?</h3>
              <p>
                La récupération se fait depuis nos stations à Paris 12e (Bastille).
                Les informations de départ sont envoyées automatiquement avant le
                début de la location.
              </p>
            </div>
            <div className="faq-item">
              <h3>Le kilométrage est-il limité pour la location ?</h3>
              <p>
                Non, toutes nos locations de voiture incluent le kilométrage illimité.
                Que vous louiez pour un jour, une semaine ou un mois, vous pouvez
                parcourir autant de kilomètres que nécessaire sans frais
                supplémentaires.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Avis clients */}
      <section className="reviews-section">
        <div className="container">
          <h2>Avis clients</h2>
          <p className="section-intro">
            Nous n’affichons pas de faux avis. Quand tu voudras, on pourra connecter des avis
            réels (Google Business Profile) ou un module dédié.
          </p>
          <div className="reviews-cta-row">
            <a
              className="btn-primary btn-primary-compact"
              href="https://www.google.com/search?q=IonyKar+Bastille+avis"
              target="_blank"
              rel="noreferrer"
            >
              Voir les avis Google
            </a>
            <Link className="btn-secondary btn-secondary-compact" to="/stations">
              Nos stations
            </Link>
          </div>
        </div>
      </section>

      {/* Section Contact */}
      <section className="contact-section" id="contact">
        <div className="container">
          <h2>Contactez-nous</h2>
          <p className="section-intro">
            Une question sur votre location de voiture ? Notre équipe est là pour vous
            aider. Contactez-nous par téléphone, email ou via notre formulaire en
            ligne.
          </p>

          <div className="contact-content">
            <div className="contact-info">
              <div className="contact-info-card">
                <div className="contact-icon">📞</div>
                <h3>Téléphone</h3>
                <p>0612193050</p>
                <p className="contact-hours">Du lundi au dimanche, 8h - 22h</p>
              </div>

              <div className="contact-info-card">
                <div className="contact-icon">✉️</div>
                <h3>Email</h3>
                <p>contact@ionykar.fr</p>
                <p className="contact-hours">Réponse sous 24h</p>
              </div>

              <div className="contact-info-card">
                <div className="contact-icon">📍</div>
                <h3>Adresse</h3>
                <p>Paris 12e — Bastille</p>
                <p>France</p>
              </div>

              <div className="contact-info-card">
                <div className="contact-icon">💬</div>
                <h3>Chat en direct</h3>
                <p>Assistance instantanée</p>
                <p className="contact-hours">7j/7, 9h - 20h</p>
              </div>
            </div>

            <div className="contact-form">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  alert(
                    "Merci pour votre message ! Nous vous répondrons dans les plus brefs délais."
                  );
                }}
              >
                <div className="form-group">
                  <label htmlFor="name">Nom complet *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    placeholder="Votre nom et prénom"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="email">Email *</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      placeholder="votre.email@exemple.fr"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="phone">Téléphone</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      placeholder="+33 6 12 34 56 78"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="subject">Sujet *</label>
                  <select id="subject" name="subject" required>
                    <option value="">Choisissez un sujet</option>
                    <option value="reservation">Question sur une réservation</option>
                    <option value="vehicule">Information sur un véhicule</option>
                    <option value="prix">Demande de devis</option>
                    <option value="probleme">Signaler un problème</option>
                    <option value="autre">Autre demande</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="message">Message *</label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows="6"
                    placeholder="Décrivez votre demande en détail..."
                  ></textarea>
                </div>

                <button type="submit" className="submit-button">
                  Envoyer le message
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="final-cta">
        <div className="container">
          <h2>Prêt à louer votre voiture ?</h2>
          <p>
            Rejoignez des milliers de clients satisfaits et louez votre véhicule au
            meilleur prix. Réservation en ligne simple, rapide et sécurisée.
          </p>
          <Link to={buildUrlWithDates("/cars")} className="btn-primary-large">
            Réserver ma voiture maintenant
          </Link>
          <p className="cta-note">
            Annulation gratuite • Sans frais cachés • Support client 7j/7
          </p>
        </div>
      </section>
      </div>
      <BackToTop />
      <Footer />
    </>
  );
}
