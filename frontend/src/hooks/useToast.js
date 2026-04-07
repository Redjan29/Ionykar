import { useState, useCallback } from "react";

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "info", duration = 4000) => {
    const id = Date.now() + Math.random();
    const newToast = { id, message, type, duration };
    
    setToasts((prev) => [...prev, newToast]);

    return id;
  }, []);

  const hideToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback((message, duration) => {
    return showToast(message, "success", duration);
  }, [showToast]);

  const error = useCallback((message, duration) => {
    return showToast(message, "error", duration);
  }, [showToast]);

  const warning = useCallback((message, duration) => {
    return showToast(message, "warning", duration);
  }, [showToast]);

  const info = useCallback((message, duration) => {
    return showToast(message, "info", duration);
  }, [showToast]);

  return {
    toasts,
    showToast,
    hideToast,
    success,
    error,
    warning,
    info,
  };
}
