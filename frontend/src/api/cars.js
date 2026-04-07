import { apiFetch } from "./client";

export function fetchCars(filters = {}) {
  const params = new URLSearchParams();

  if (filters.startDate) {
    params.set("startDate", filters.startDate);
  }

  if (filters.endDate) {
    params.set("endDate", filters.endDate);
  }

  const query = params.toString();
  return apiFetch(`/api/cars/available${query ? `?${query}` : ""}`);
}

export function fetchCarById(id) {
  return apiFetch(`/api/cars/${id}`);
}