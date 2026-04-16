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

export function getProfile() {
  return apiFetch("/api/auth/profile");
}

export function logout() {
  return apiFetch("/api/auth/logout", { method: "POST" });
}

export function verifyEmail(token) {
  return apiFetch("/api/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export function resendVerification(email) {
  return apiFetch("/api/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function forgotPassword(email) {
  return apiFetch("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(token, password) {
  return apiFetch("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}

export function activateAccount(email, password) {
  return apiFetch("/api/auth/activate-account", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}
