import { apiFetch } from "./client";

export function createReservation(payload) {
  return apiFetch("/api/reservations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getMyReservations() {
  return apiFetch("/api/reservations/my");
}

export function getReservationById(reservationId) {
  return apiFetch(`/api/reservations/${reservationId}`);
}

export function cancelMyReservation(reservationId) {
  return apiFetch(`/api/reservations/my/${reservationId}/cancel`, {
    method: "PATCH",
  });
}