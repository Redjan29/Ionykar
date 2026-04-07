import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";

export default function Stations() {
  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "44px 20px" }}>
        <h1 style={{ fontFamily: "var(--ik-font-title)" }}>Nos stations</h1>
        <p style={{ color: "var(--ik-muted)", lineHeight: 1.8 }}>
          Cette page présentera les stations d’autopartage IonyKar (Paris 12e — Bastille).
          Elle est prévue dans la navigation principale du cahier des charges.
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
            À venir: carte + liste des stations, horaires, consignes de prise en charge.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}

