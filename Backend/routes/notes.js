"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const multer = require("multer");

const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const {
  UPLOAD_DIR,
  MAX_FILE_SIZE,
  ALLOWED_EXTENSIONS,
  BRANCHES,
  CATEGORIES,
  SEMESTERS
} = require("../config");

const router = express.Router();

/* Every notes route needs a logged-in user (same as the old protected pages). */
router.use(requireAuth);

/* ---------- File upload handling ---------- */

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // Random name on disk: the user-supplied name never touches the filesystem.
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, crypto.randomUUID() + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: 1, fields: 10 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (!ALLOWED_EXTENSIONS.has(ext)) {
      const error = new Error(
        "This file type is not allowed. Allowed: " +
          [...ALLOWED_EXTENSIONS].join(", ")
      );
      error.status = 400;
      return cb(error);
    }

    cb(null, true);
  }
});

function handleUpload(req, res, next) {
  upload.single("file")(req, res, error => {
    if (!error) return next();

    if (error.code === "LIMIT_FILE_SIZE") {
      return res
        .status(413)
        .json({ error: "File size must not exceed 10 MB." });
    }

    if (error instanceof multer.MulterError) {
      return res.status(400).json({ error: "Upload failed: " + error.message });
    }

    next(error);
  });
}

function removeFile(storedName) {
  if (!storedName) return;
  // basename() guards against any path tricks even though names are ours.
  fs.unlink(path.join(UPLOAD_DIR, path.basename(storedName)), () => {});
}

/* ---------- Shared query pieces ---------- */

const SELECT_NOTES = `
  SELECT n.id, n.title, n.subject, n.semester, n.branch, n.category,
         n.description, n.file_name, n.file_type, n.file_size, n.created_at,
         n.user_id, u.name AS uploader_name
  FROM notes n
  JOIN users u ON u.id = n.user_id
`;

function toNote(row, currentUserId) {
  return {
    id: row.id,
    title: row.title,
    subject: row.subject,
    semester: row.semester,
    branch: row.branch,
    category: row.category,
    description: row.description,
    fileName: row.file_name,
    fileType: row.file_type,
    fileSize: row.file_size,
    uploader: row.uploader_name,
    uploadDate: row.created_at,
    isMine: row.user_id === currentUserId
  };
}

function escapeLike(text) {
  return text.replace(/[\\%_]/g, ch => "\\" + ch);
}

/* ---------- Routes ---------- */

/* GET /api/notes/stats  -> dashboard numbers + 3 latest notes */
router.get("/stats", (req, res) => {
  const total = db.prepare("SELECT COUNT(*) AS c FROM notes").get().c;
  const mine = db
    .prepare("SELECT COUNT(*) AS c FROM notes WHERE user_id = ?")
    .get(req.user.id).c;

  const recent = db
    .prepare(SELECT_NOTES + " ORDER BY n.created_at DESC, n.id DESC LIMIT 3")
    .all()
    .map(row => toNote(row, req.user.id));

  res.json({ total, mine, recent });
});

/*
 * GET /api/notes
 * Query: q, semester, branch, category, mine=1, limit (<=100), offset
 */
router.get("/", (req, res) => {
  const where = [];
  const params = [];

  const q = String(req.query.q || "").trim().slice(0, 100);
  if (q) {
    const like = "%" + escapeLike(q) + "%";
    where.push(
      "(n.title LIKE ? ESCAPE '\\' OR n.subject LIKE ? ESCAPE '\\' OR n.description LIKE ? ESCAPE '\\')"
    );
    params.push(like, like, like);
  }

  if (req.query.semester) {
    where.push("n.semester = ?");
    params.push(Number(req.query.semester));
  }

  if (req.query.branch) {
    where.push("n.branch = ?");
    params.push(String(req.query.branch));
  }

  if (req.query.category) {
    where.push("n.category = ?");
    params.push(String(req.query.category));
  }

  if (req.query.mine === "1" || req.query.mine === "true") {
    where.push("n.user_id = ?");
    params.push(req.user.id);
  }

  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

  const whereSql = where.length ? " WHERE " + where.join(" AND ") : "";

  const total = db
    .prepare("SELECT COUNT(*) AS c FROM notes n" + whereSql)
    .get(...params).c;

  const rows = db
    .prepare(
      SELECT_NOTES +
        whereSql +
        " ORDER BY n.created_at DESC, n.id DESC LIMIT ? OFFSET ?"
    )
    .all(...params, limit, offset);

  res.json({
    total,
    limit,
    offset,
    notes: rows.map(row => toNote(row, req.user.id))
  });
});

/* POST /api/notes  (multipart/form-data) */
router.post("/", handleUpload, (req, res) => {
  const file = req.file;

  const fail = (status, message) => {
    if (file) removeFile(file.filename);
    return res.status(status).json({ error: message });
  };

  if (!file) return fail(400, "Please choose a file to upload.");

  const title = String(req.body.title || "").trim();
  const subject = String(req.body.subject || "").trim();
  const description = String(req.body.description || "").trim();
  const branch = String(req.body.branch || "").trim();
  const category = String(req.body.category || "").trim();
  const semester = Number(req.body.semester);

  if (!title || !subject || !branch || !category || !req.body.semester) {
    return fail(400, "Please complete all required fields.");
  }

  if (title.length > 150) return fail(400, "Title is too long (max 150).");
  if (subject.length > 100) return fail(400, "Subject is too long (max 100).");
  if (description.length > 1000) {
    return fail(400, "Description is too long (max 1000).");
  }
  if (!SEMESTERS.includes(semester)) return fail(400, "Invalid semester.");
  if (!BRANCHES.includes(branch)) return fail(400, "Invalid branch.");
  if (!CATEGORIES.includes(category)) return fail(400, "Invalid category.");

  // Multer decodes the multipart filename as latin1; restore the UTF-8 name.
  const originalName = Buffer.from(file.originalname, "latin1")
    .toString("utf8")
    .replace(/[\\/\u0000-\u001f]/g, "_")
    .slice(0, 200);

  try {
    const info = db
      .prepare(
        `INSERT INTO notes
           (user_id, title, subject, semester, branch, category, description,
            file_name, stored_name, file_type, file_size)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        req.user.id,
        title,
        subject,
        semester,
        branch,
        category,
        description,
        originalName,
        file.filename,
        file.mimetype || "",
        file.size
      );

    const row = db
      .prepare(SELECT_NOTES + " WHERE n.id = ?")
      .get(info.lastInsertRowid);

    res.status(201).json({ note: toNote(row, req.user.id) });
  } catch (error) {
    removeFile(file.filename);
    throw error;
  }
});

/* GET /api/notes/:id/download */
router.get("/:id/download", (req, res) => {
  const note = db
    .prepare("SELECT file_name, stored_name, file_type FROM notes WHERE id = ?")
    .get(Number(req.params.id));

  if (!note) return res.status(404).json({ error: "Note not found." });

  const filePath = path.join(UPLOAD_DIR, path.basename(note.stored_name));

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "The file is missing on the server." });
  }

  // Always a download, never rendered in the browser, and never sniffed.
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.download(filePath, note.file_name);
});

/* DELETE /api/notes/:id  (owner only) */
router.delete("/:id", (req, res) => {
  const note = db
    .prepare("SELECT id, user_id, stored_name FROM notes WHERE id = ?")
    .get(Number(req.params.id));

  if (!note) return res.status(404).json({ error: "Note not found." });

  if (note.user_id !== req.user.id) {
    return res.status(403).json({ error: "You can only delete your own notes." });
  }

  db.prepare("DELETE FROM notes WHERE id = ?").run(note.id);
  removeFile(note.stored_name);

  res.json({ ok: true });
});

module.exports = router;
