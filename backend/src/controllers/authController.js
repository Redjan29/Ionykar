import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import validator from "validator";
import { User } from "../models/index.js";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../config/jwt.js";
import { sendEmail } from "../services/email.js";

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function setAuthCookie(res, token) {
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie("auth_token", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    path: "/",
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  });
}

function clearAuthCookie(res) {
  res.clearCookie("auth_token", { path: "/" });
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function getSiteUrl() {
  const raw = process.env.SITE_URL || process.env.FRONTEND_URL || "http://localhost:5173";
  return String(raw).replace(/\/+$/, "");
}

async function sendVerificationEmail({ userEmail, token }) {
  const siteUrl = getSiteUrl();
  const verifyUrl = `${siteUrl}/verify-email?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to: userEmail,
    subject: "Confirmez votre adresse email — IonyKar",
    text: `Bonjour,\n\nPour confirmer votre adresse email, cliquez sur ce lien : ${verifyUrl}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet email.\n`,
    html: `<p>Bonjour,</p><p>Pour confirmer votre adresse email, cliquez sur ce lien :</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`,
  });
}

async function sendPasswordResetEmail({ userEmail, token }) {
  const siteUrl = getSiteUrl();
  const resetUrl = `${siteUrl}/reset-password?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to: userEmail,
    subject: "Réinitialisation de mot de passe — IonyKar",
    text: `Bonjour,\n\nPour réinitialiser votre mot de passe, cliquez sur ce lien : ${resetUrl}\n\nCe lien expire dans 1 heure.\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet email.\n`,
    html: `<p>Bonjour,</p><p>Pour réinitialiser votre mot de passe, cliquez sur ce lien :</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Ce lien expire dans 1 heure.</p><p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`,
  });
}

export async function register(req, res, next) {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      address,
      licenseNumber,
      licenseExpiry,
    } = req.body;

    // Validation des champs requis
    if (!email || !password || !firstName || !lastName || !phone) {
      const err = new Error("All fields are required");
      err.status = 400;
      throw err;
    }

    // Validation de l'email
    if (!validator.isEmail(email)) {
      const err = new Error("Invalid email address");
      err.status = 400;
      throw err;
    }

    // Validation du mot de passe (minimum 8 caractères, au moins 1 chiffre)
    if (password.length < 8) {
      const err = new Error("Password must be at least 8 characters");
      err.status = 400;
      throw err;
    }

    if (!/\d/.test(password)) {
      const err = new Error("Password must contain at least one number");
      err.status = 400;
      throw err;
    }

    // Vérification email déjà utilisé
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      const err = new Error("Email already in use");
      err.status = 409;
      throw err;
    }

    // Hash du mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Création de l'utilisateur
    const user = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      hasPassword: true,
      firstName,
      lastName,
      phone,
      address,
      licenseNumber,
      licenseExpiry,
      emailVerified: false,
    });

    // Email verification token
    const rawToken = crypto.randomBytes(32).toString("hex");
    user.emailVerificationTokenHash = sha256Hex(rawToken);
    user.emailVerificationTokenExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h
    await user.save();

    await sendVerificationEmail({ userEmail: user.email, token: rawToken });

    // Réponse sans le mot de passe
    const userResponse = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      licenseNumber: user.licenseNumber,
      licenseExpiry: user.licenseExpiry,
      isAdmin: user.isAdmin || false,
      emailVerified: user.emailVerified,
    };

    res.status(201).json({
      data: {
        user: userResponse,
        verificationRequired: true,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    // Validation des champs
    if (!email || !password) {
      const err = new Error("Email and password are required");
      err.status = 400;
      throw err;
    }

    // Validation de l'email
    if (!validator.isEmail(email)) {
      const err = new Error("Invalid email address");
      err.status = 400;
      throw err;
    }

    // Recherche de l'utilisateur (avec password car select: false dans le modèle)
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user) {
      const err = new Error("Invalid email or password");
      err.status = 401;
      throw err;
    }

    // Vérification que l'utilisateur a un mot de passe
    if (!user.hasPassword) {
      const err = new Error("Account not activated. Please set a password first.");
      err.status = 401;
      throw err;
    }

    // Vérification du mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      const err = new Error("Invalid email or password");
      err.status = 401;
      throw err;
    }

    // Vérification que le compte est actif
    if (!user.isActive) {
      const err = new Error("Account is disabled");
      err.status = 403;
      throw err;
    }

    if (!user.emailVerified) {
      const err = new Error("Please verify your email first");
      err.status = 403;
      throw err;
    }

    // Génération du token
    const token = generateToken(user._id);
    setAuthCookie(res, token);

    // Réponse sans le mot de passe
    const userResponse = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      licenseNumber: user.licenseNumber,
      licenseExpiry: user.licenseExpiry,
      isAdmin: user.isAdmin || false,
      emailVerified: user.emailVerified,
    };

    res.json({
      data: {
        user: userResponse,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getProfile(req, res, next) {
  try {
    // req.user est ajouté par le middleware auth
    const user = await User.findById(req.user.userId).select("-password");
    
    if (!user) {
      const err = new Error("User not found");
      err.status = 404;
      throw err;
    }

    res.json({ data: user });
  } catch (error) {
    next(error);
  }
}

export async function activateAccount(req, res, next) {
  try {
    const { email, password } = req.body;

    // Validation des champs
    if (!email || !password) {
      const err = new Error("Email and password are required");
      err.status = 400;
      throw err;
    }

    // Validation du mot de passe (minimum 8 caractères, au moins 1 chiffre)
    if (password.length < 8) {
      const err = new Error("Password must be at least 8 characters");
      err.status = 400;
      throw err;
    }

    if (!/\d/.test(password)) {
      const err = new Error("Password must contain at least one number");
      err.status = 400;
      throw err;
    }

    // Recherche de l'utilisateur — réponse générique pour ne pas révéler l'existence du compte
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || user.hasPassword) {
      const err = new Error("If this account exists and is not yet activated, an action will be taken.");
      err.status = 400;
      throw err;
    }

    // Hash du mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Mise à jour de l'utilisateur
    user.password = hashedPassword;
    user.hasPassword = true;
    if (!user.emailVerified) {
      // Keep unverified until they verify through email link.
    }
    await user.save();

    // keep behavior consistent: still require verification
    const rawToken = crypto.randomBytes(32).toString("hex");
    user.emailVerificationTokenHash = sha256Hex(rawToken);
    user.emailVerificationTokenExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
    await user.save();
    await sendVerificationEmail({ userEmail: user.email, token: rawToken });

    // Réponse sans le mot de passe
    const userResponse = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      licenseNumber: user.licenseNumber,
      licenseExpiry: user.licenseExpiry,
      isAdmin: user.isAdmin || false,
      emailVerified: user.emailVerified,
    };

    res.json({
      data: {
        user: userResponse,
        verificationRequired: true,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyEmail(req, res, next) {
  try {
    const { token } = req.body;
    if (!token) {
      const err = new Error("Token is required");
      err.status = 400;
      throw err;
    }

    const hash = sha256Hex(token);
    const user = await User.findOne({
      emailVerificationTokenHash: hash,
      emailVerificationTokenExpiresAt: { $gt: new Date() },
    }).select("+emailVerificationTokenHash +emailVerificationTokenExpiresAt");

    if (!user) {
      const err = new Error("Invalid or expired token");
      err.status = 400;
      throw err;
    }

    user.emailVerified = true;
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationTokenExpiresAt = undefined;
    await user.save();

    const jwtToken = generateToken(user._id);
    setAuthCookie(res, jwtToken);

    res.json({
      data: {
        ok: true,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          licenseNumber: user.licenseNumber,
          licenseExpiry: user.licenseExpiry,
          isAdmin: user.isAdmin || false,
          emailVerified: user.emailVerified,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function resendVerification(req, res, next) {
  try {
    const { email } = req.body;
    if (!email || !validator.isEmail(email)) {
      const err = new Error("Valid email is required");
      err.status = 400;
      throw err;
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+emailVerificationTokenHash +emailVerificationTokenExpiresAt"
    );

    // Always respond ok (avoid account enumeration)
    if (!user || user.emailVerified) {
      return res.json({ data: { ok: true } });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    user.emailVerificationTokenHash = sha256Hex(rawToken);
    user.emailVerificationTokenExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
    await user.save();

    await sendVerificationEmail({ userEmail: user.email, token: rawToken });
    return res.json({ data: { ok: true } });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email || !validator.isEmail(email)) {
      const err = new Error("Valid email is required");
      err.status = 400;
      throw err;
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+passwordResetTokenHash +passwordResetTokenExpiresAt"
    );

    // Always respond ok (avoid account enumeration)
    if (!user || !user.emailVerified) {
      return res.json({ data: { ok: true } });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    user.passwordResetTokenHash = sha256Hex(rawToken);
    user.passwordResetTokenExpiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1h
    await user.save();

    await sendPasswordResetEmail({ userEmail: user.email, token: rawToken });
    return res.json({ data: { ok: true } });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      const err = new Error("Token and password are required");
      err.status = 400;
      throw err;
    }
    if (password.length < 8) {
      const err = new Error("Password must be at least 8 characters");
      err.status = 400;
      throw err;
    }
    if (!/\d/.test(password)) {
      const err = new Error("Password must contain at least one number");
      err.status = 400;
      throw err;
    }

    const hash = sha256Hex(token);
    const user = await User.findOne({
      passwordResetTokenHash: hash,
      passwordResetTokenExpiresAt: { $gt: new Date() },
    }).select("+passwordResetTokenHash +passwordResetTokenExpiresAt +password");

    if (!user) {
      const err = new Error("Invalid or expired token");
      err.status = 400;
      throw err;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    user.password = hashedPassword;
    user.hasPassword = true;
    user.passwordResetTokenHash = undefined;
    user.passwordResetTokenExpiresAt = undefined;
    await user.save();

    res.json({ data: { ok: true } });
  } catch (error) {
    next(error);
  }
}

export async function logout(req, res, next) {
  try {
    clearAuthCookie(res);
    res.json({ data: { ok: true } });
  } catch (error) {
    next(error);
  }
}
