const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export const FALLBACK_CAR_IMAGE =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Crect width='100%25' height='100%25' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%236b7280' font-family='Arial' font-size='14'%3ECar%3C/text%3E%3C/svg%3E";

export function resolveImageUrl(url) {
  if (!url || typeof url !== "string") {
    return FALLBACK_CAR_IMAGE;
  }

  const normalized = url.trim();
  if (!normalized) {
    return FALLBACK_CAR_IMAGE;
  }

  if (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("data:")
  ) {
    return normalized;
  }

  // Legacy seeded images are served by frontend public folder.
  if (normalized.startsWith("/cars/")) {
    return normalized;
  }

  // Admin uploads are served by backend.
  if (normalized.startsWith("/uploads/")) {
    return `${API_BASE_URL}${normalized}`;
  }

  if (normalized.startsWith("uploads/")) {
    return `${API_BASE_URL}/${normalized}`;
  }

  if (normalized.startsWith("/")) {
    return normalized;
  }

  return normalized;
}
