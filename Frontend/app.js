/* =========================================
   EduShare - app.js
   Talks to the EduShare backend (Express + SQLite).
   Login uses a token stored in localStorage.
========================================= */

const API_BASE = window.EDUSHARE_API_BASE || "/api";
const TOKEN_KEY = "edushare_token";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB (the server enforces this too)
const ALLOWED_EXTENSIONS = [
    ".pdf", ".doc", ".docx", ".ppt", ".pptx",
    ".xls", ".xlsx", ".txt", ".md",
    ".png", ".jpg", ".jpeg", ".zip"
];


/* =========================================
   TOKEN + API HELPER
========================================= */

function getToken() {
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch (error) {
        return null;
    }
}

function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
    try {
        localStorage.removeItem(TOKEN_KEY);
    } catch (error) {
        /* ignore */
    }
}

class ApiError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}

/*
 * api("/notes")                          -> GET
 * api("/auth/login", { json: {...} })    -> POST JSON
 * api("/notes", { form: FormData })      -> POST multipart
 * api("/notes/3", { method: "DELETE" })
 */
async function api(path, options = {}) {
    const headers = {};
    const token = getToken();

    if (token) headers.Authorization = "Bearer " + token;

    const init = { method: options.method || "GET", headers };

    if (options.json) {
        init.method = options.method || "POST";
        headers["Content-Type"] = "application/json";
        init.body = JSON.stringify(options.json);
    } else if (options.form) {
        init.method = options.method || "POST";
        init.body = options.form; // browser sets the multipart boundary
    }

    let response;

    try {
        response = await fetch(API_BASE + path, init);
    } catch (error) {
        throw new ApiError(
            "Cannot reach the server. Make sure the backend is running.",
            0
        );
    }

    if (options.raw && response.ok) return response;

    let data = null;

    try {
        data = await response.json();
    } catch (error) {
        /* not JSON */
    }

    if (!response.ok) {
        // Expired or invalid session on a protected call: go back to login.
        if (response.status === 401 && token && !options.noRedirect) {
            clearToken();
            window.location.href = "login.html";
        }

        throw new ApiError(
            (data && data.error) || "Request failed (" + response.status + ").",
            response.status
        );
    }

    return data;
}


/* =========================================
   MESSAGE DISPLAY
========================================= */

function showMessage(message, type = "error") {
    const messageBox = document.getElementById("message");

    if (!messageBox) {
        alert(message);
        return;
    }

    messageBox.textContent = message;
    messageBox.className = `message ${type}`;
}


/* =========================================
   CURRENT USER
========================================= */

let currentUser = null;

function formatDate(isoString) {
    const date = new Date(isoString);

    return isNaN(date)
        ? "Unknown"
        : date.toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric"
          });
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}


/* =========================================
   REGISTER
========================================= */

async function registerUser(event) {
    event.preventDefault();

    const name = document.getElementById("name")?.value.trim();
    const email = document.getElementById("email")?.value.trim();
    const password = document.getElementById("password")?.value;
    const confirmPassword =
        document.getElementById("confirmPassword")?.value;

    if (!name || !email || !password) {
        showMessage("Please fill in all fields.");
        return;
    }

    if (password.length < 8) {
        showMessage("Password must be at least 8 characters.");
        return;
    }

    if (password !== confirmPassword) {
        showMessage("Passwords do not match.");
        return;
    }

    const button = event.target.querySelector('button[type="submit"]');
    if (button) button.disabled = true;

    try {
        const data = await api("/auth/register", {
            json: { name, email, password },
            noRedirect: true
        });

        setToken(data.token);
        showMessage("Account created! Redirecting...", "success");
        window.location.href = "dashboard.html";
    } catch (error) {
        showMessage(error.message);
        if (button) button.disabled = false;
    }
}


/* =========================================
   LOGIN / LOGOUT
========================================= */

async function loginUser(event) {
    event.preventDefault();

    const email = document.getElementById("email")?.value.trim();
    const password = document.getElementById("password")?.value;

    if (!email || !password) {
        showMessage("Please enter your email and password.");
        return;
    }

    const button = event.target.querySelector('button[type="submit"]');
    if (button) button.disabled = true;

    try {
        const data = await api("/auth/login", {
            json: { email, password },
            noRedirect: true
        });

        setToken(data.token);
        showMessage("Login successful!", "success");
        window.location.href = "dashboard.html";
    } catch (error) {
        showMessage(error.message);
        if (button) button.disabled = false;
    }
}

function logout() {
    clearToken();
    window.location.href = "login.html";
}


/* =========================================
   NAVIGATION
========================================= */

function buildNavigation(page) {
    const nav = document.getElementById("navLinks");

    // Pages with their own hand-written links are left alone.
    if (!nav || nav.children.length > 0) return;

    const links = [
        ["dashboard.html", "Dashboard"],
        ["upload.html", "Upload Notes"],
        ["notes.html", "Browse Notes"],
        ["my-uploads.html", "My Uploads"],
        ["profile.html", "My Profile"]
    ];

    links.forEach(([href, label]) => {
        const link = document.createElement("a");
        link.href = href;
        link.textContent = label;
        if (href === page) link.className = "active";
        nav.appendChild(link);
    });

    const logoutLink = document.createElement("a");
    logoutLink.href = "#";
    logoutLink.textContent = "Log Out";
    logoutLink.addEventListener("click", event => {
        event.preventDefault();
        logout();
    });
    nav.appendChild(logoutLink);
}


/* =========================================
   RENDER NOTES
========================================= */

function makeLine(text) {
    const p = document.createElement("p");
    p.textContent = text;
    return p;
}

function renderNotes(notes, containerId, options = {}) {
    const container = document.getElementById(containerId);

    if (!container) {
        console.error(`Container not found: ${containerId}`);
        return;
    }

    container.innerHTML = "";

    if (!notes || notes.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "empty";
        emptyMessage.textContent = options.emptyText ||
            "📚 No notes found. Try changing your filters!";
        container.appendChild(emptyMessage);
        return;
    }

    notes.forEach(note => {
        const noteCard = document.createElement("div");
        noteCard.className = "note-card";

        const title = document.createElement("h3");
        title.textContent = note.title || "Untitled Note";

        const downloadButton = document.createElement("button");
        downloadButton.textContent = "Download";
        downloadButton.type = "button";
        downloadButton.className = "btn";
        downloadButton.addEventListener("click", () => {
            downloadNote(note.id, note.fileName, downloadButton);
        });

        noteCard.append(
            title,
            makeLine("Subject: " + (note.subject || "Not specified")),
            makeLine("Semester: " + (note.semester || "Not specified")),
            makeLine("Branch: " + (note.branch || "Not specified")),
            makeLine("Category: " + (note.category || "Not specified")),
            makeLine(note.description || "No description."),
            makeLine(
                "File: " + (note.fileName || "Unknown") +
                " (" + formatSize(note.fileSize || 0) + ")"
            ),
            makeLine("Uploaded by: " + (note.uploader || "Unknown")),
            makeLine("Date: " + formatDate(note.uploadDate)),
            downloadButton
        );

        if (options.showDelete && note.isMine) {
            const deleteButton = document.createElement("button");
            deleteButton.textContent = "Delete";
            deleteButton.type = "button";
            deleteButton.className = "btn btn-danger";
            deleteButton.addEventListener("click", () => {
                deleteNote(note.id, note.title);
            });
            noteCard.appendChild(deleteButton);
        }

        container.appendChild(noteCard);
    });
}


/* =========================================
   DASHBOARD
========================================= */

async function loadDashboard() {
    const welcome = document.getElementById("welcome");

    if (welcome) {
        welcome.textContent = "Welcome, " + currentUser.name + "! 👋";
    }

    try {
        const stats = await api("/notes/stats");

        const totalNotes = document.getElementById("totalNotes");
        const myNotes = document.getElementById("myNotes");
        const recentNotes = document.getElementById("recentNotes");

        if (totalNotes) totalNotes.textContent = stats.total;
        if (myNotes) myNotes.textContent = stats.mine;

        if (recentNotes) {
            recentNotes.innerHTML = "";

            if (stats.recent.length === 0) {
                const empty = document.createElement("p");
                empty.className = "empty";
                empty.textContent =
                    "No notes yet. Be the first to share one!";
                recentNotes.appendChild(empty);
            }

            stats.recent.forEach(note => {
                const card = document.createElement("article");
                card.className = "card";

                const title = document.createElement("h3");
                title.textContent = note.title || "Untitled Note";

                card.append(
                    title,
                    makeLine("Subject: " + (note.subject || "Not specified")),
                    makeLine("Branch: " + (note.branch || "Not specified")),
                    makeLine("Semester: " + (note.semester || "Not specified"))
                );

                recentNotes.appendChild(card);
            });
        }
    } catch (error) {
        console.error("Dashboard error:", error);
        showMessage(error.message);
    }
}


/* =========================================
   UPLOAD NOTES
========================================= */

async function uploadNote(event) {
    if (event) event.preventDefault();

    const title = document.getElementById("title")?.value.trim();
    const subject = document.getElementById("subject")?.value.trim();
    const semester = document.getElementById("semester")?.value.trim();
    const branch = document.getElementById("branch")?.value.trim();
    const category = document.getElementById("category")?.value.trim();
    const description =
        document.getElementById("description")?.value.trim() || "";

    const file = document.getElementById("file")?.files?.[0];

    if (!title || !subject || !semester || !branch || !category || !file) {
        showMessage("Please complete all required fields.");
        return;
    }

    if (file.size > MAX_FILE_SIZE) {
        showMessage("File size must not exceed 10 MB.");
        return;
    }

    const extension = (file.name.match(/\.[^.]+$/) || [""])[0].toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
        showMessage(
            "This file type is not allowed. Allowed: " +
            ALLOWED_EXTENSIONS.join(", ")
        );
        return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("subject", subject);
    formData.append("semester", semester);
    formData.append("branch", branch);
    formData.append("category", category);
    formData.append("description", description);
    formData.append("file", file); // keep "file" last

    const button = event?.target?.querySelector('button[type="submit"]');
    if (button) {
        button.disabled = true;
        button.textContent = "Uploading...";
    }

    try {
        await api("/notes", { form: formData });

        showMessage("Note uploaded successfully!", "success");

        setTimeout(() => {
            window.location.href = "my-uploads.html";
        }, 800);
    } catch (error) {
        console.error("Upload error:", error);
        showMessage(error.message);

        if (button) {
            button.disabled = false;
            button.textContent = "Upload Notes";
        }
    }
}


/* =========================================
   BROWSE + SEARCH + FILTER
========================================= */

let notesRequestId = 0;

async function loadNotes() {
    const params = new URLSearchParams();

    const search = document.getElementById("search")?.value.trim();
    const semester = document.getElementById("filterSemester")?.value;
    const branch = document.getElementById("branch")?.value;
    const category = document.getElementById("filterCategory")?.value;

    if (search) params.set("q", search);
    if (semester) params.set("semester", semester);
    if (branch) params.set("branch", branch);
    if (category) params.set("category", category);

    // Ignore slow, out-of-date responses if the user keeps typing.
    const requestId = ++notesRequestId;

    try {
        const data = await api("/notes?" + params.toString());

        if (requestId !== notesRequestId) return;

        renderNotes(data.notes, "notesContainer");
    } catch (error) {
        if (requestId !== notesRequestId) return;
        console.error("Load notes error:", error);

        const container = document.getElementById("notesContainer");
        if (container) {
            container.innerHTML = "";
            const message = document.createElement("p");
            message.className = "empty";
            message.textContent = error.message;
            container.appendChild(message);
        }
    }
}

let filterTimer = null;

function filterNotes() {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(loadNotes, 250);
}


/* =========================================
   DOWNLOAD
========================================= */

async function downloadNote(noteId, fileName, button) {
    if (button) button.disabled = true;

    try {
        // The file is protected, so fetch it with the login token
        // and hand the browser a temporary local link.
        const response = await api(`/notes/${noteId}/download`, { raw: true });
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = fileName || "notes";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (error) {
        console.error("Download error:", error);
        alert(error.message);
    } finally {
        if (button) button.disabled = false;
    }
}


/* =========================================
   MY UPLOADS + DELETE
========================================= */

async function loadMyUploads() {
    try {
        const data = await api("/notes?mine=1&limit=100");

        renderNotes(data.notes, "myUploadsContainer", {
            showDelete: true,
            emptyText: "📁 You haven't uploaded anything yet."
        });
    } catch (error) {
        console.error("My uploads error:", error);
        showMessage(error.message);
    }
}

async function deleteNote(noteId, noteTitle) {
    if (!confirm(`Delete "${noteTitle || "this note"}"? This cannot be undone.`)) {
        return;
    }

    try {
        await api(`/notes/${noteId}`, { method: "DELETE" });
        loadMyUploads();
    } catch (error) {
        console.error("Delete error:", error);
        alert(error.message);
    }
}


/* =========================================
   PROFILE
========================================= */

function loadProfile() {
    const name = currentUser.name || "EduShare Student";

    const set = (id, text) => {
        const element = document.getElementById(id);
        if (element) element.textContent = text;
    };

    set("profileName", name);
    set("profileEmail", currentUser.email);
    set("detailName", name);
    set("detailEmail", currentUser.email);
    set("detailProvider", "Email and Password");
    set("detailSince", formatDate(currentUser.createdAt));
    set(
        "profileAvatar",
        name.trim().charAt(0).toUpperCase() || "👤"
    );

    const message = document.getElementById("profileMessage");
    const details = document.getElementById("profileDetails");

    if (message) message.hidden = true;
    if (details) details.hidden = false;

    document.getElementById("logoutBtn")?.addEventListener("click", logout);
}


/* =========================================
   MAKE FUNCTIONS AVAILABLE TO HTML
========================================= */

window.registerUser = registerUser;
window.loginUser = loginUser;
window.logout = logout;
window.uploadNote = uploadNote;
window.loadNotes = loadNotes;
window.filterNotes = filterNotes;
window.loadMyUploads = loadMyUploads;
window.deleteNote = deleteNote;
window.downloadNote = downloadNote;


/* =========================================
   PAGE INITIALIZATION
========================================= */

const PROTECTED_PAGES = [
    "dashboard.html",
    "upload.html",
    "notes.html",
    "my-uploads.html",
    "profile.html"
];

const GUEST_PAGES = ["login.html", "register.html", "index.html"];

async function initPage() {
    const page = window.location.pathname.split("/").pop() || "index.html";
    const hasToken = Boolean(getToken());

    if (PROTECTED_PAGES.includes(page) && !hasToken) {
        window.location.href = "login.html";
        return;
    }

    // Logged-in visitors don't need the login / register pages.
    if (GUEST_PAGES.includes(page) && hasToken) {
        try {
            await api("/auth/me", { noRedirect: true });
            window.location.href = "dashboard.html";
        } catch (error) {
            clearToken(); // stale token
        }
        return;
    }

    if (!PROTECTED_PAGES.includes(page)) return;

    try {
        const data = await api("/auth/me");
        currentUser = data.user;
    } catch (error) {
        // api() already redirects on 401; this covers "server offline".
        if (error.status === 0) showMessage(error.message);
        return;
    }

    buildNavigation(page);

    switch (page) {
        case "dashboard.html":
            loadDashboard();
            break;

        case "notes.html":
            loadNotes();
            break;

        case "my-uploads.html":
            loadMyUploads();
            break;

        case "profile.html":
            loadProfile();
            break;
    }
}

initPage();
