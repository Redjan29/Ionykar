import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
// import mongoSanitize from "express-mongo-sanitize"; // Temporarily disabled - causing issues with Node.js getters
import { connectDB } from "./src/config/db.js";
import { errorHandler } from "./src/middlewares/errorHandler.js";
import healthRoutes from "./src/routes/health.js";
import authRoutes from "./src/routes/auth.js";

import carsRoutes from "./src/routes/cars.js";
import reservationsRoutes from "./src/routes/reservations.js";
import adminRoutes from "./src/routes/admin.js";
import usersRoutes from "./src/routes/users.js";

import path from "path";


const app = express();
// Serve uploaded images as static files
const uploadsPath = path.resolve(process.cwd(), "uploads");
app.use("/uploads", express.static(uploadsPath));
const isProduction = process.env.NODE_ENV === "production";


function sanitizeObject(value) {
  if (!value || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeObject(item));
  }

  const sanitized = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    // Prevent MongoDB operators and dotted paths from being injected.
    if (key.startsWith("$") || key.includes(".")) {
      continue;
    }
    sanitized[key] = sanitizeObject(nestedValue);
  }

  return sanitized;
}

// CORS configuration - allow multiple origins in development
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3001",
  "http://localhost:3002", 
  "http://localhost:3003",
  "http://localhost:5173",
  "https://www.rrloc.fr"
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

// Security Middlewares
app.use(helmet());
app.use(cors(corsOptions));

// Body parser with size limits (MUST be before mongoSanitize)
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Data sanitization against NoSQL injection (AFTER body parser)
app.use((req, res, next) => {
  req.body = sanitizeObject(req.body);

  const sanitizedQuery = sanitizeObject(req.query);
  for (const key of Object.keys(req.query || {})) {
    delete req.query[key];
  }
  Object.assign(req.query, sanitizedQuery);

  const sanitizedParams = sanitizeObject(req.params);
  for (const key of Object.keys(req.params || {})) {
    delete req.params[key];
  }
  Object.assign(req.params, sanitizedParams);

  next();
});

// Rate limiting for auth routes (prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window (increased for testing)
  message: "Too many login attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !isProduction, // Disabled outside production
});

// General rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !isProduction, // Disabled outside production
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/", generalLimiter);

// Routes
app.use("/", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/cars", carsRoutes);
app.use("/api/reservations", reservationsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", usersRoutes);


// Error handling middleware
app.use(errorHandler);

// Database connection
await connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
