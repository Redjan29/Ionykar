import { apiFetch } from "./client";

export function createReservation(payload) {
  return apiFetch("/api/reservations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getMyReservations(token) {
  return apiFetch("/api/reservations/my", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function getReservationById(token, reservationId) {
  return apiFetch(`/api/reservations/${reservationId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function cancelMyReservation(token, reservationId) {
  return apiFetch(`/api/reservations/my/${reservationId}/cancel`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}