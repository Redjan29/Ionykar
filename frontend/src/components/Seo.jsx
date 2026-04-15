import { Helmet } from "react-helmet-async";

function resolveSiteUrl() {
  const fromEnv = import.meta.env?.VITE_SITE_URL;
  if (fromEnv) return String(fromEnv).replace(/\/+$/, "");
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  return "https://www.ionykar.fr";
}

export default function Seo({ title, description, canonicalPath = "/", robots, jsonLd }) {
  const siteUrl = resolveSiteUrl();
  const canonicalUrl = `${siteUrl}${canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`}`;

  return (
    <Helmet>
      {title ? <title>{title}</title> : null}
      {description ? <meta name="description" content={description} /> : null}
      <link rel="canonical" href={canonicalUrl} />
      {robots ? <meta name="robots" content={robots} /> : null}
      {title ? <meta property="og:title" content={title} /> : null}
      {description ? <meta property="og:description" content={description} /> : null}
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      {title ? <meta name="twitter:title" content={title} /> : null}
      {description ? <meta name="twitter:description" content={description} /> : null}
      {jsonLd ? (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      ) : null}
    </Helmet>
  );
}

