import { apiFetch } from "./client";

function getAuthHeaders() {
  const token = localStorage.getItem("car_rental_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getProfile() {
  return apiFetch("/api/users/profile", {
    headers: getAuthHeaders(),
  });
}

export function updateProfile(profileData) {
  return apiFetch("/api/users/profile", {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(profileData),
  });
}

export async function uploadMyDocument(docType, file) {
  const token = localStorage.getItem("car_rental_token");
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"}/api/users/documents/${encodeURIComponent(
      docType
    )}`,
    {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }
  );

  const json = await response.json().catch(() => null);
  if (!response.ok) {
    const message = json?.error?.message || json?.message || "Upload failed";
    throw new Error(message);
  }
  return json?.data || json;
}

export function listMyInvoices() {
  return apiFetch("/api/users/invoices", {
    headers: getAuthHeaders(),
  });
}

export function listMyCreditNotes() {
  return apiFetch("/api/users/credit-notes", {
    headers: getAuthHeaders(),
  });
}
