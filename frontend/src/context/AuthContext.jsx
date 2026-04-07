import { createContext, useContext, useState, useEffect } from "react";
import { login as apiLogin, register as apiRegister, getProfile } from "../api/auth";

const AuthContext = createContext(null);

const TOKEN_KEY = "car_rental_token";
const USER_KEY = "car_rental_user";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Chargement initial depuis localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      
      // Vérification du token en arrière-plan
      getProfile(savedToken)
        .then((data) => {
          setUser(data);
          localStorage.setItem(USER_KEY, JSON.stringify(data));
        })
        .catch(() => {
          // Token invalide ou expiré
          logout();
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  async function login(email, password) {
    const response = await apiLogin({ email, password });
    const { user: userData, token: userToken } = response;

    setUser(userData);
    setToken(userToken);
    localStorage.setItem(TOKEN_KEY, userToken);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));

    return userData;
  }

  async function register(userData) {
    const response = await apiRegister(userData);
    const { user: newUser, token: userToken } = response;

    setUser(newUser);
    setToken(userToken);
    localStorage.setItem(TOKEN_KEY, userToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));

    return newUser;
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  const value = {
    user,
    token,
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
