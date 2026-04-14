import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";

export default function MentionsLegales() {
  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "44px 20px" }}>
        <h1 style={{ fontFamily: "var(--ik-font-title)" }}>Mentions légales</h1>
        <p style={{ color: "var(--ik-muted)", lineHeight: 1.8 }}>
          Cette page regroupe les informations légales d’IonyKar (éditeur du site,
          adresse, contact, etc.). À compléter avec les informations officielles de
          l’entreprise.
        </p>

        <div
          style={{
            marginTop: 18,
            padding: 18,
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 14,
            background: "rgba(255,255,255,0.04)",
          }}
        >
          <ul style={{ margin: 0, paddingLeft: 18, color: "var(--ik-muted)" }}>
            <li>Raison sociale: IonyKar SAS</li>
            <li>Siège: Paris 12e — Bastille</li>
            <li>Email: contact@ionykar.fr</li>
            <li>Téléphone: +33 6 13 65 76 87</li>
            <li>Téléphone (secondaire): +33 6 12 19 30 50</li>
            <li>Hébergeur: à renseigner</li>
          </ul>
        </div>
      </main>
      <Footer />
    </>
  );
}

