"use strict";

const express = require("express");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");

const db = require("../db");
const { signToken, requireAuth } = require("../middleware/auth");
const { AUTH_RATE_LIMIT_MAX } = require("../config");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again later." }
});

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// A real hash to compare against when the email is unknown, so response
// time does not reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

const insertUser = db.prepare(
  "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)"
);
const findByEmail = db.prepare("SELECT * FROM users WHERE email = ?");

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.created_at
  };
}

/* POST /api/auth/register */
router.post("/register", authLimiter, async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (name.length < 2 || name.length > 80) {
      return res
        .status(400)
        .json({ error: "Name must be 2 to 80 characters." });
    }

    if (!EMAIL_PATTERN.test(email) || email.length > 254) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    if (password.length < 8 || password.length > 72) {
      // bcrypt only uses the first 72 bytes, so cap it.
      return res
        .status(400)
        .json({ error: "Password must be 8 to 72 characters." });
    }

    if (findByEmail.get(email)) {
      return res
        .status(409)
        .json({ error: "An account with this email already exists." });
    }

    const hash = await bcrypt.hash(password, 12);
    const info = insertUser.run(name, email, hash);
    const user = findByEmail.get(email);

    res.status(201).json({
      token: signToken(info.lastInsertRowid),
      user: publicUser(user)
    });
  } catch (error) {
    // Two sign-ups with the same email at the same instant.
    if (/UNIQUE constraint failed/i.test(String(error.message))) {
      return res
        .status(409)
        .json({ error: "An account with this email already exists." });
    }
    next(error);
  }
});

/* POST /api/auth/login */
router.post("/login", authLimiter, async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    const user = findByEmail.get(email);
    const matches = await bcrypt.compare(
      password,
      user ? user.password_hash : DUMMY_HASH
    );

    if (!user || !matches) {
      return res.status(401).json({ error: "Incorrect email or password." });
    }

    res.json({ token: signToken(user.id), user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

/* GET /api/auth/me */
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

module.exports = router;
