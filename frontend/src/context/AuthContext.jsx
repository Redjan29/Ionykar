/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from "react";
import { login as apiLogin, register as apiRegister, getProfile, logout as apiLogout } from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Chargement initial depuis cookie httpOnly (appel profile)
  useEffect(() => {
    getProfile()
      .then((data) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const response = await apiLogin({ email, password });
    const { user: userData } = response;

    setUser(userData);

    return userData;
  }

  async function register(userData) {
    const response = await apiRegister(userData);
    // Register now requires email verification; do not mark authenticated here.
    return response;
  }

  async function logout() {
    try {
      await apiLogout();
    } catch {
      // ignore
    }
    setUser(null);
  }

  const value = {
    user,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
