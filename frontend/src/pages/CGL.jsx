import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";

export default function CGL() {
  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "44px 20px" }}>
        <h1 style={{ fontFamily: "var(--ik-font-title)" }}>
          Conditions Générales de Location (CGL)
        </h1>
        <p style={{ color: "var(--ik-muted)", lineHeight: 1.8, marginTop: 12 }}>
          Vous pouvez consulter les Conditions Générales de Location d’IonyKar ci-dessous,
          ou les télécharger au format PDF.
        </p>

        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
            marginTop: 14,
          }}
        >
          <a
            href="/cgl-ionykar-v6.pdf"
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 14px",
              borderRadius: 12,
              background: "var(--ik-yellow)",
              color: "var(--ik-black)",
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: "0 12px 26px rgba(252, 190, 12, 0.18)",
            }}
          >
            Télécharger le PDF (CGL V6)
          </a>
          <span style={{ color: "var(--ik-muted-2)", fontSize: 13 }}>
            Document: « CGL IonyKar SAS V6 »
          </span>
        </div>

        <div
          style={{
            marginTop: 18,
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 14,
            background: "rgba(255,255,255,0.04)",
            overflow: "hidden",
            boxShadow: "0 14px 30px rgba(0,0,0,0.28)",
          }}
        >
          <iframe
            title="CGL IonyKar"
            src="/cgl-ionykar-v6.pdf"
            style={{ width: "100%", height: "75vh", border: "none" }}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}

