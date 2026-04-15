/* eslint-disable react-refresh/only-export-components */
// src/context/AppContext.jsx
import { createContext, useContext, useState } from "react";

const AppContext = createContext(null);
const ALLOWED_CURRENCIES = ["EUR", "USD"];
const ALLOWED_LANGUAGES = ["fr", "en"];

export function AppProvider({ children }) {
  const [currency, setCurrency] = useState("EUR"); // "EUR" | "USD"
  const [language, setLanguage] = useState("fr");  // "fr" | "en"

  // taux simples pour l'instant (mock)
  const rates = {
    EUR: 1,
    USD: 1.1, // exemple : 1€ ≈ 1.1$
  };

  const currencySymbols = {
    EUR: "€",
    USD: "$",
  };

  function convertPrice(eurPrice) {
    const rate = rates[currency] ?? 1;
    const raw = eurPrice * rate;
    // On arrondit à l'unité pour rester simple
    return Math.round(raw);
  }

  function formatPrice(eurPrice) {
    const amount = convertPrice(eurPrice);
    const symbol = currencySymbols[currency] ?? "€";
    return `${amount}${symbol}`;
  }

  function updateCurrency(nextCurrency) {
    if (ALLOWED_CURRENCIES.includes(nextCurrency)) {
      setCurrency(nextCurrency);
    }
  }

  function updateLanguage(nextLanguage) {
    if (ALLOWED_LANGUAGES.includes(nextLanguage)) {
      setLanguage(nextLanguage);
    }
  }

  const value = {
    currency,
    setCurrency: updateCurrency,
    language,
    setLanguage: updateLanguage,
    convertPrice,
    formatPrice,
    allowedCurrencies: ALLOWED_CURRENCIES,
    allowedLanguages: ALLOWED_LANGUAGES,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useAppContext must be used inside AppProvider");
  }
  return ctx;
}
