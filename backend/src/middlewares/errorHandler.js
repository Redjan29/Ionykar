// Middleware de gestion des erreurs
export function errorHandler(err, req, res, next) {
  // Log détaillé en développement
  if (process.env.NODE_ENV !== 'production') {
    console.error("❌ Error:", err.message);
    console.error("Stack:", err.stack);
  } else {
    console.error("Error:", err.message);
  }

  const status = err.status || 500;
  // Ne pas exposer les détails d'erreurs internes au client en production
  const message = status < 500 || process.env.NODE_ENV !== 'production' 
    ? err.message 
    : "Internal Server Error";

  res.status(status).json({
    error: {
      status,
      message,
    },
  });
}
