import jwt from "jsonwebtoken";
import { User } from "../models/index.js";
import { JWT_SECRET } from "../config/jwt.js";

function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  // cookie-based auth (preferred)
  if (req.cookies?.auth_token) {
    return req.cookies.auth_token;
  }
  return null;
}

export function authMiddleware(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      const err = new Error("No token provided");
      err.status = 401;
      throw err;
    }

    // Vérification du token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Ajout des infos utilisateur à la requête
    req.user = decoded;
    
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      error.message = "Invalid token";
      error.status = 401;
    } else if (error.name === "TokenExpiredError") {
      error.message = "Token expired";
      error.status = 401;
    }
    next(error);
  }
}

// Middleware optionnel : récupère l'utilisateur s'il est connecté, mais n'exige pas de token
export function optionalAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (token) req.user = jwt.verify(token, JWT_SECRET);
    
    next();
  } catch (error) {
    // On ignore les erreurs pour l'auth optionnelle
    next();
  }
}

// Middleware admin : vérifie que l'utilisateur est administrateur
export async function adminMiddleware(req, res, next) {
  try {
    if (!req.user || !req.user.userId) {
      const err = new Error("Authentication required");
      err.status = 401;
      throw err;
    }

    // Récupération de l'utilisateur depuis la DB
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      const err = new Error("User not found");
      err.status = 404;
      throw err;
    }

    if (!user.isAdmin) {
      const err = new Error("Admin access required");
      err.status = 403;
      throw err;
    }

    // Ajouter l'objet user complet à la requête
    req.adminUser = user;
    
    next();
  } catch (error) {
    next(error);
  }
}
