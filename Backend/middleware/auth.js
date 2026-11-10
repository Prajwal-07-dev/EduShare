"use strict";

const jwt = require("jsonwebtoken");
const db = require("../db");
const { JWT_SECRET, JWT_EXPIRES_IN } = require("../config");

const findUserById = db.prepare(
  "SELECT id, name, email, created_at FROM users WHERE id = ?"
);

function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: JWT_EXPIRES_IN
  });
}

/* Requires "Authorization: Bearer <token>" and attaches req.user. */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Please log in." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"]
    });

    const user = findUserById.get(Number(payload.sub));

    if (!user) {
      return res.status(401).json({ error: "Account no longer exists." });
    }

    req.user = user;
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ error: "Your session has expired. Please log in again." });
  }
}

module.exports = { signToken, requireAuth };
