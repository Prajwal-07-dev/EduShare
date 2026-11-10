# EduShare — Student Notes Sharing Platform

**Learn. Share. Grow.**

EduShare is a student-focused web application for sharing and finding academic notes. Students can upload study material and browse it by branch, semester, and category.

## Features

- **User accounts** — Register and log in with email and password.
- **My Profile** — View account details.
- **Upload Notes** — Share notes, question papers, lab manuals, and assignments (up to 10 MB).
- **Browse Notes** — Notes from all students, shared across browsers and devices.
- **Search and Filters** — Search by keyword and filter by branch, semester, and category.
- **My Uploads** — View and delete your own uploads.
- **Responsive Interface** — Works on different screen sizes.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, JavaScript (no framework) |
| Backend | Node.js, Express |
| Database | SQLite (built into Node.js, no extra install) |
| File storage | Server disk (`Backend/data/uploads`) |
| Authentication | Email + password (`bcryptjs`), JWT login tokens |

## Project Structure

```text
EduShare/
├── Backend/
│   ├── server.js            # Express app entry point
│   ├── config.js            # Settings, limits, allowed values
│   ├── db.js                # SQLite connection and tables
│   ├── middleware/auth.js   # JWT check
│   ├── routes/auth.js       # register, login, me
│   ├── routes/notes.js      # list, upload, download, delete
│   ├── package.json
│   └── .env.example
└── Frontend/
    ├── index.html  login.html  register.html
    ├── dashboard.html  upload.html  notes.html
    ├── my-uploads.html  profile.html
    ├── style.css
    ├── config.js            # where the API lives
    └── app.js               # all page logic
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 22.13 or newer (the LTS or Current download both work)

### 1. Install

```bash
cd EduShare/Backend
npm install
```

### 2. Configure

```bash
copy .env.example .env      # Windows
# cp .env.example .env      # macOS / Linux
```

Open `.env` and set `JWT_SECRET` to a long random value. Generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

You may see an "ExperimentalWarning: SQLite" message when the server starts. It is harmless.

If you skip this during development, a secret is generated automatically into `Backend/data/.jwt_secret`.

### 3. Run

```bash
npm start
```

Open **http://localhost:3000**. The server also serves the `Frontend` folder, so there is nothing else to start.

You can also open the frontend with VS Code Live Server (for example `http://127.0.0.1:5500`). `Frontend/config.js` then points the pages at the API on port 3000 automatically.

## API Overview

All `/api/notes` routes require `Authorization: Bearer <token>`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Log in, receive a token |
| GET | `/api/auth/me` | Current user |
| GET | `/api/notes` | List notes (`q`, `semester`, `branch`, `category`, `mine=1`, `limit`, `offset`) |
| GET | `/api/notes/stats` | Dashboard counts and latest notes |
| POST | `/api/notes` | Upload a note (multipart form, field `file`) |
| GET | `/api/notes/:id/download` | Download the file |
| DELETE | `/api/notes/:id` | Delete your own note |

## Security

- Passwords are hashed with bcrypt; plain passwords are never stored.
- Login and register are rate limited.
- All database queries are parameterized.
- Uploads are limited to 10 MB and an allow-list of file types, stored under random names, and always sent back as downloads (never rendered in the browser).
- Only the `Frontend` folder is served as static files, so `.env`, the database, and uploads cannot be fetched directly.
- Only the owner of a note can delete it.
- The login token is kept in the browser's `localStorage`. This is simple and fine for a project of this size, but it means any cross-site-scripting bug could expose it. The frontend writes all user content with `textContent` to avoid that.

## Deploying

- Host the `Backend` on a Node host (Render, Railway, a VPS, etc.). Set `JWT_SECRET` and `TRUST_PROXY=1` in its environment.
- **Persist the `data/` folder** (database and uploads). On hosts with a temporary filesystem, attach a persistent disk or move uploads to object storage.
- Serve over HTTPS.
- If the frontend is hosted on a different domain, set `window.EDUSHARE_API_BASE` in `Frontend/config.js` and add the frontend's origin to `CORS_ORIGINS` in `.env`.
- Back up `data/` regularly.

## Future Improvements

- [ ] Google sign-in (OAuth) and password reset by email
- [ ] Move uploaded files to object storage (S3-compatible) for hosting without a persistent disk
- [ ] Note previews and improved search
- [ ] Likes, ratings, or bookmarks
- [ ] Admin moderation tools
- [ ] Automated tests and accessibility improvements

## Contributing

1. Fork the repository.
2. Create a feature branch.
3. Commit your changes.
4. Open a pull request describing your improvements.
