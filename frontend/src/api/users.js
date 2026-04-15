import { apiFetch } from "./client";

export function getProfile() {
  return apiFetch("/api/users/profile");
}

export function updateProfile(profileData) {
  return apiFetch("/api/users/profile", {
    method: "PUT",
    body: JSON.stringify(profileData),
  });
}

export async function uploadMyDocument(docType, file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"}/api/users/documents/${encodeURIComponent(
      docType
    )}`,
    {
      method: "POST",
      credentials: "include",
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
  return apiFetch("/api/users/invoices");
}

export function listMyCreditNotes() {
  return apiFetch("/api/users/credit-notes");
}
