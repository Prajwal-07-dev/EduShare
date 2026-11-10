"use strict";

const path = require("path");
const express = require("express");
const cors = require("cors");

const config = require("./config");
require("./db"); // creates tables on first run

const authRoutes = require("./routes/auth");
const noteRoutes = require("./routes/notes");

const app = express();

if (process.env.TRUST_PROXY) {
  app.set("trust proxy", Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
}

app.disable("x-powered-by");

/* ---------- Basic security headers ---------- */
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  next();
});

/* ---------- CORS (only needed if the frontend is on another origin) ---------- */
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

app.use(
  "/api",
  cors({
    origin(origin, callback) {
      // No Origin header = same-origin request, curl, etc.
      if (
        !origin ||
        LOCAL_ORIGIN.test(origin) ||
        config.CORS_ORIGINS.includes(origin)
      ) {
        return callback(null, true);
      }
      callback(null, false);
    }
  })
);

app.use(express.json({ limit: "10kb" }));

/* ---------- API ---------- */
app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/notes", noteRoutes);

app.use("/api", (req, res) => {
  res.status(404).json({ error: "Not found." });
});

/* ---------- Frontend (optional convenience) ---------- */
// Only the Frontend folder is served, never the Backend folder, so .env,
// the database and uploaded files can't be fetched as static files.
app.use(express.static(config.FRONTEND_DIR, { index: "index.html", dotfiles: "deny" }));

/* ---------- Error handler ---------- */
app.use((error, req, res, next) => {
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON." });
  }

  if (error.status && error.status < 500) {
    return res.status(error.status).json({ error: error.message });
  }

  console.error(error);
  res.status(500).json({ error: "Something went wrong on the server." });
});

if (require.main === module) {
  app.listen(config.PORT, () => {
    console.log(`EduShare running at http://localhost:${config.PORT}`);
    console.log(`Serving frontend from ${path.relative(process.cwd(), config.FRONTEND_DIR) || "."}`);
  });
}

module.exports = app;
