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
