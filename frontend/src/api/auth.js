import { apiFetch } from "./client";

export function register(userData) {
  return apiFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(userData),
  });
}

export function login(credentials) {
  return apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export function getProfile(token) {
  return apiFetch("/api/auth/profile", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function activateAccount(email, password) {
  return apiFetch("/api/auth/activate-account", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}
