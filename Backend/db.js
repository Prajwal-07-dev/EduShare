"use strict";

/*
 * Uses the SQLite that ships inside Node.js (node:sqlite), so there is no
 * native package to compile. Needs Node 22.13 or newer.
 */
let DatabaseSync;

try {
  ({ DatabaseSync } = require("node:sqlite"));
} catch (error) {
  console.error(
    "This version of Node.js has no built-in SQLite. Please install Node.js 22.13 or newer from https://nodejs.org"
  );
  process.exit(1);
}

const { DB_FILE } = require("./config");

const db = new DatabaseSync(DB_FILE);

db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT    NOT NULL,
    created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  CREATE TABLE IF NOT EXISTS notes (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title        TEXT    NOT NULL,
    subject      TEXT    NOT NULL,
    semester     INTEGER NOT NULL,
    branch       TEXT    NOT NULL,
    category     TEXT    NOT NULL,
    description  TEXT    NOT NULL DEFAULT '',
    file_name    TEXT    NOT NULL,   -- original name shown to users
    stored_name  TEXT    NOT NULL,   -- random name on disk
    file_type    TEXT    NOT NULL DEFAULT '',
    file_size    INTEGER NOT NULL,
    created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  CREATE INDEX IF NOT EXISTS idx_notes_user     ON notes(user_id);
  CREATE INDEX IF NOT EXISTS idx_notes_created  ON notes(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_notes_filters  ON notes(semester, branch, category);
`);

module.exports = db;
