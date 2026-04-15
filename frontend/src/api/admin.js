import { apiFetch } from "./client";

// Récupérer les stats du dashboard
export function getDashboardStats() {
  return apiFetch("/api/admin/stats");
}

// Lister toutes les réservations
export function getAllReservations(filters = {}) {
  const params = new URLSearchParams(filters);
  return apiFetch(`/api/admin/reservations?${params}`);
}

// Mettre à jour le statut d'une réservation
export function updateReservationStatus(reservationId, status, notes) {
  return apiFetch(`/api/admin/reservations/${reservationId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, notes }),
  });
}

// Lister tous les utilisateurs
export function getAllUsers(filters = {}) {
  const params = new URLSearchParams(filters);
  return apiFetch(`/api/admin/users?${params}`);
}

// Mettre à jour un utilisateur
export function updateUser(userId, updates) {
  return apiFetch(`/api/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export function reviewUserDocument(userId, docType, payload) {
  return apiFetch(`/api/admin/users/${userId}/documents/${docType}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function reviewUserProfile(userId, payload) {
  return apiFetch(`/api/admin/users/${userId}/profile-review`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// Lister toutes les voitures (admin)
export function getAllCars() {
  return apiFetch("/api/admin/cars");
}

// Créer une voiture (admin)
export function createCar(payload) {
  return apiFetch("/api/admin/cars", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Mettre à jour une voiture (admin)
export function updateCar(carId, updates) {
  return apiFetch(`/api/admin/cars/${carId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

// Récupérer les dépenses d'entretien
export function getMaintenanceRecords(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, value);
    }
  });

  return apiFetch(`/api/admin/maintenance-records?${params.toString()}`);
}

// Créer un entretien
export function createMaintenanceRecord(data) {
  return apiFetch("/api/admin/maintenance-records", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Supprimer un entretien
export function deleteMaintenanceRecord(recordId) {
  return apiFetch(`/api/admin/maintenance-records/${recordId}`, {
    method: "DELETE",
  });
}

// Récupérer les périodes bloquées d'une voiture
export function getBlockedPeriods(carId) {
  return apiFetch(`/api/admin/cars/${carId}/blocks`);
}

// Récupérer toutes les périodes bloquées (optionnellement filtrées)
export function getAllBlockedPeriods(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, value);
    }
  });

  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiFetch(`/api/admin/blocks${suffix}`);
}

// Créer une période bloquée
export function createBlockedPeriod(carId, data) {
  return apiFetch(`/api/admin/cars/${carId}/blocks`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Supprimer une période bloquée
export function deleteBlockedPeriod(blockId) {
  return apiFetch(`/api/admin/blocks/${blockId}`, {
    method: "DELETE",
  });
}

export function getFinanceProfitability(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, value);
    }
  });

  return apiFetch(`/api/admin/finance/profitability?${params.toString()}`);
}

export function getFinanceSummary(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, value);
    }
  });

  return apiFetch(`/api/admin/finance/summary?${params.toString()}`);
}

export function getFinanceRevenueTimeseries(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, value);
    }
  });
  return apiFetch(`/api/admin/finance/revenue-timeseries?${params.toString()}`);
}

export function getFinanceCharges(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, value);
    }
  });

  return apiFetch(`/api/admin/finance/charges?${params.toString()}`);
}

export function listInvoices(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, value);
  });
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiFetch(`/api/admin/invoices${suffix}`);
}

export function createInvoiceForReservation(reservationId) {
  return apiFetch(`/api/admin/reservations/${reservationId}/invoice`, {
    method: "POST",
  });
}

export function listCreditNotes(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, value);
  });
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiFetch(`/api/admin/credit-notes${suffix}`);
}

export function createCreditNoteForReservation(reservationId, payload) {
  return apiFetch(`/api/admin/reservations/${reservationId}/credit-note`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createFinanceCharge(payload) {
  return apiFetch("/api/admin/finance/charges", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteFinanceCharge(chargeId) {
  return apiFetch(`/api/admin/finance/charges/${chargeId}`, {
    method: "DELETE",
  });
}

export function updateCarInvestment(carId, payload) {
  return apiFetch(`/api/admin/finance/cars/${carId}/investment`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function uploadCarImages(files) {
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));

  return apiFetch("/api/admin/cars/upload-images", {
    method: "POST",
    body: formData,
  });
}
