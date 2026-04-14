import { apiFetch } from "./client";

// Récupérer les stats du dashboard
export function getDashboardStats(token) {
  return apiFetch("/api/admin/stats", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

// Lister toutes les réservations
export function getAllReservations(token, filters = {}) {
  const params = new URLSearchParams(filters);
  return apiFetch(`/api/admin/reservations?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

// Mettre à jour le statut d'une réservation
export function updateReservationStatus(token, reservationId, status, notes) {
  return apiFetch(`/api/admin/reservations/${reservationId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, notes }),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

// Lister tous les utilisateurs
export function getAllUsers(token, filters = {}) {
  const params = new URLSearchParams(filters);
  return apiFetch(`/api/admin/users?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

// Mettre à jour un utilisateur
export function updateUser(token, userId, updates) {
  return apiFetch(`/api/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function reviewUserDocument(token, userId, docType, payload) {
  return apiFetch(`/api/admin/users/${userId}/documents/${docType}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function reviewUserProfile(token, userId, payload) {
  return apiFetch(`/api/admin/users/${userId}/profile-review`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

// Lister toutes les voitures (admin)
export function getAllCars(token) {
  return apiFetch("/api/admin/cars", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

// Créer une voiture (admin)
export function createCar(token, payload) {
  return apiFetch("/api/admin/cars", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

// Mettre à jour une voiture (admin)
export function updateCar(token, carId, updates) {
  return apiFetch(`/api/admin/cars/${carId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

// Récupérer les dépenses d'entretien
export function getMaintenanceRecords(token, filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, value);
    }
  });

  return apiFetch(`/api/admin/maintenance-records?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

// Créer un entretien
export function createMaintenanceRecord(token, data) {
  return apiFetch("/api/admin/maintenance-records", {
    method: "POST",
    body: JSON.stringify(data),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

// Supprimer un entretien
export function deleteMaintenanceRecord(token, recordId) {
  return apiFetch(`/api/admin/maintenance-records/${recordId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

// Récupérer les périodes bloquées d'une voiture
export function getBlockedPeriods(token, carId) {
  return apiFetch(`/api/admin/cars/${carId}/blocks`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

// Récupérer toutes les périodes bloquées (optionnellement filtrées)
export function getAllBlockedPeriods(token, filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, value);
    }
  });

  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiFetch(`/api/admin/blocks${suffix}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

// Créer une période bloquée
export function createBlockedPeriod(token, carId, data) {
  return apiFetch(`/api/admin/cars/${carId}/blocks`, {
    method: "POST",
    body: JSON.stringify(data),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

// Supprimer une période bloquée
export function deleteBlockedPeriod(token, blockId) {
  return apiFetch(`/api/admin/blocks/${blockId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function getFinanceProfitability(token, filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, value);
    }
  });

  return apiFetch(`/api/admin/finance/profitability?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function getFinanceSummary(token, filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, value);
    }
  });

  return apiFetch(`/api/admin/finance/summary?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function getFinanceCharges(token, filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, value);
    }
  });

  return apiFetch(`/api/admin/finance/charges?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function createFinanceCharge(token, payload) {
  return apiFetch("/api/admin/finance/charges", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function deleteFinanceCharge(token, chargeId) {
  return apiFetch(`/api/admin/finance/charges/${chargeId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function updateCarInvestment(token, carId, payload) {
  return apiFetch(`/api/admin/finance/cars/${carId}/investment`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function uploadCarImages(token, files) {
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));

  return apiFetch("/api/admin/cars/upload-images", {
    method: "POST",
    body: formData,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
