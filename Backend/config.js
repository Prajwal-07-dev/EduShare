"use strict";

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = path.resolve(
  __dirname,
  process.env.DATA_DIR || "data"
);
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/*
 * JWT secret.
 * Production: set JWT_SECRET in .env (at least 32 random characters).
 * Development fallback: generate one once and keep it in data/.jwt_secret
 * so logins survive a server restart.
 */
function loadJwtSecret() {
  if (process.env.JWT_SECRET) {
    if (process.env.JWT_SECRET.length < 32) {
      console.warn(
        "[config] JWT_SECRET is shorter than 32 characters. Use a longer random value."
      );
    }
    return process.env.JWT_SECRET;
  }

  const secretFile = path.join(DATA_DIR, ".jwt_secret");

  if (fs.existsSync(secretFile)) {
    return fs.readFileSync(secretFile, "utf8").trim();
  }

  const secret = crypto.randomBytes(48).toString("hex");
  fs.writeFileSync(secretFile, secret, { mode: 0o600 });
  console.warn(
    "[config] JWT_SECRET is not set. Generated a development secret in data/.jwt_secret. " +
      "Set JWT_SECRET in .env before deploying."
  );
  return secret;
}

const frontendDir = path.resolve(
  __dirname,
  process.env.FRONTEND_DIR || "../Frontend"
);

module.exports = {
  PORT: Number(process.env.PORT) || 3000,
  DATA_DIR,
  UPLOAD_DIR,
  DB_FILE: path.join(DATA_DIR, "edushare.db"),
  FRONTEND_DIR: frontendDir,
  JWT_SECRET: loadJwtSecret(),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",

  // Comma-separated list of extra allowed origins (for a frontend hosted elsewhere).
  // localhost / 127.0.0.1 on any port are always allowed in development.
  CORS_ORIGINS: (process.env.CORS_ORIGINS || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean),

  AUTH_RATE_LIMIT_MAX: Number(process.env.AUTH_RATE_LIMIT_MAX) || 30,

  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10 MB

  ALLOWED_EXTENSIONS: new Set([
    ".pdf", ".doc", ".docx", ".ppt", ".pptx",
    ".xls", ".xlsx", ".txt", ".md",
    ".png", ".jpg", ".jpeg", ".zip"
  ]),

  BRANCHES: ["CSE", "IT", "ECE", "IC", "MECH", "CIVIL", "CI"],
  CATEGORIES: ["Notes", "Question Papers", "Lab Manuals", "Assignments"],
  SEMESTERS: [1, 2, 3, 4, 5, 6, 7, 8]
};
