import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";

export default function PolitiqueConfidentialite() {
  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "44px 20px" }}>
        <h1 style={{ fontFamily: "var(--ik-font-title)" }}>
          Politique de confidentialité
        </h1>
        <p style={{ color: "var(--ik-muted)", lineHeight: 1.8 }}>
          Cette page décrit comment IonyKar collecte et traite les données
          personnelles (création de compte, réservation, documents, paiements,
          etc.). À finaliser selon les choix techniques et l’outillage (Stripe,
          Docuseal, stockage, emails).
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
          <p style={{ margin: 0, color: "var(--ik-muted)" }}>
            Points à inclure: finalités, base légale, durée de conservation,
            destinataires, droits (accès/rectification/suppression), cookies, et
            contact RGPD.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}

