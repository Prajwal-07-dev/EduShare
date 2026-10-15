
/* =========================================
   EduShare - Firebase Authentication
   app.js
========================================= */

import { auth } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";


// =========================================
// LOCAL STORAGE NOTES
// Notes are stored locally for now.
// =========================================

function getNotes() {
    try {
        return JSON.parse(
            localStorage.getItem("edushare_notes") || "[]"
        );
    } catch (error) {
        console.error("Could not read notes:", error);
        return [];
    }
}

function saveNotes(notes) {
    localStorage.setItem(
        "edushare_notes",
        JSON.stringify(notes)
    );
}


// =========================================
// MESSAGE DISPLAY
// =========================================

function showMessage(message, type = "error") {
    const messageBox = document.getElementById("message");

    if (!messageBox) {
        alert(message);
        return;
    }

    messageBox.textContent = message;
    messageBox.className = `message ${type}`;
}


// =========================================
// FIREBASE USER
// =========================================

let currentFirebaseUser = null;

function requireLogin() {
    if (!currentFirebaseUser) {
        window.location.href = "login.html";
        return null;
    }

    return {
        id: currentFirebaseUser.uid,
        name: currentFirebaseUser.displayName || "",
        email: currentFirebaseUser.email || ""
    };
}


// =========================================
// LOGOUT
// =========================================

async function logout() {
    try {
        await signOut(auth);
        window.location.href = "login.html";
    } catch (error) {
        console.error("Logout error:", error);
        showMessage("Could not log out. Please try again.");
    }
}

window.logout = logout;


// =========================================
// NAVIGATION
// =========================================

function updateNavigation() {
    const user = requireLogin();

    if (!user) return;

    const userNameElement = document.getElementById("userName");

    if (userNameElement) {
        userNameElement.textContent = user.name || user.email;
    }
}


// =========================================
// DASHBOARD
// =========================================

function loadDashboard() {
    const user = requireLogin();

    if (!user) return;

    const notes = getNotes();

    const totalNotes = document.getElementById("totalNotes");
    const myNotes = document.getElementById("myNotes");
    const recentNotes = document.getElementById("recentNotes");

    if (totalNotes) {
        totalNotes.textContent = notes.length;
    }

    if (myNotes) {
        myNotes.textContent = notes.filter(
            note => note.uploaderId === user.id
                || note.uploaderEmail === user.email
        ).length;
    }

    if (recentNotes) {
        recentNotes.innerHTML = "";

        const latestNotes = [...notes].reverse().slice(0, 3);

        latestNotes.forEach(note => {
            const card = document.createElement("article");
            card.className = "card";

            const title = document.createElement("h3");
            title.textContent = note.title || "Untitled Note";

            const subject = document.createElement("p");
            subject.textContent =
                "Subject: " + (note.subject || "Not specified");

            const branch = document.createElement("p");
            branch.textContent =
                "Branch: " + (note.branch || "Not specified");

            const semester = document.createElement("p");
            semester.textContent =
                "Semester: " + (note.semester || "Not specified");

            card.append(title, subject, branch, semester);
            recentNotes.appendChild(card);
        });
    }
}


// =========================================
// UPLOAD NOTES
// =========================================

function uploadNote(event) {
    if (event) {
        event.preventDefault();
    }

    const user = requireLogin();

    if (!user) return;

    const title =
        document.getElementById("title")?.value.trim();

    const subject =
        document.getElementById("subject")?.value.trim();

    const semester =
        document.getElementById("semester")?.value.trim();

    const branch =
        document.getElementById("branch")?.value.trim();

    const category =
        document.getElementById("category")?.value.trim();

    const description =
        document.getElementById("description")?.value.trim() || "";

    const fileInput = document.getElementById("file");
    const file = fileInput?.files?.[0];

    // Check required fields
    if (
        !title ||
        !subject ||
        !semester ||
        !branch ||
        !category ||
        !file
    ) {
        showMessage("Please complete all required fields.");
        return;
    }

    // Maximum file size: 10 MB
    const maxSize = 10 * 1024 * 1024;

    if (file.size > maxSize) {
        showMessage("File size must not exceed 10 MB.");
        return;
    }

    const reader = new FileReader();

    reader.onload = function () {
        try {
            const notes = getNotes();

            const newNote = {
                id: Date.now(),

                title,
                subject,
                semester,
                branch,
                category,
                description,

                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                fileData: reader.result,

                uploaderId: user.id,
                uploader: user.name || user.email,
                uploaderEmail: user.email,

                uploadDate: new Date().toLocaleDateString()
            };

            notes.push(newNote);
            saveNotes(notes);

            showMessage(
                "Note uploaded successfully!",
                "success"
            );

            setTimeout(() => {
                window.location.href = "my-uploads.html";
            }, 1000);

        } catch (error) {
            console.error("Upload error:", error);
            showMessage("Could not save the note.");
        }
    };

    reader.onerror = function () {
        showMessage("Could not read the selected file.");
    };

    reader.readAsDataURL(file);
}


// =========================================
// DISPLAY NOTES
// =========================================

function renderNotes(
    notes,
    containerId = "notesContainer"
) {
    const container = document.getElementById(containerId);

    if (!container) {
        console.error(`Container not found: ${containerId}`);
        return;
    }

    container.innerHTML = "";

    if (!notes || notes.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "empty";
        emptyMessage.textContent =
            "📚 No notes found. Try changing your filters!";

        container.appendChild(emptyMessage);
        return;
    }

    notes.forEach(note => {
        const noteCard = document.createElement("div");
        noteCard.className = "note-card";

        const title = document.createElement("h3");
        title.textContent = note.title || "Untitled Note";

        const subject = document.createElement("p");
        subject.textContent =
            "Subject: " + (note.subject || "Not specified");

        const semester = document.createElement("p");
        semester.textContent =
            "Semester: " + (note.semester || "Not specified");

        const branch = document.createElement("p");
        branch.textContent =
            "Branch: " + (note.branch || "Not specified");

        const category = document.createElement("p");
        category.textContent =
            "Category: " + (note.category || "Not specified");

        const description = document.createElement("p");
        description.textContent =
            note.description || "No description.";

        const uploader = document.createElement("p");
        uploader.textContent =
            "Uploaded by: " + (note.uploader || "Unknown");

        const date = document.createElement("p");
        date.textContent =
            "Date: " + (note.uploadDate || "Unknown");

        const downloadButton = document.createElement("button");
        downloadButton.textContent = "Download";
        downloadButton.type = "button";
        downloadButton.className = "btn";

        downloadButton.addEventListener("click", () => {
            downloadNote(note.id);
        });

        noteCard.append(
            title,
            subject,
            semester,
            branch,
            category,
            description,
            uploader,
            date,
            downloadButton
        );

        container.appendChild(noteCard);
    });
}


// =========================================
// LOAD ALL NOTES
// =========================================

function loadNotes() {
    renderNotes(getNotes(), "notesContainer");
}


// =========================================
// SEARCH AND FILTER NOTES
// =========================================

function filterNotes() {
    const searchValue =
        document.getElementById("search")
            ?.value.toLowerCase().trim() || "";

    const semesterValue =
        document.getElementById("filterSemester")?.value || "";

    const branchValue =
        document.getElementById("branch")?.value || "";

    const categoryValue =
        document.getElementById("filterCategory")?.value || "";

    const filteredNotes = getNotes().filter(note => {
        const title =
            (note.title || "").toLowerCase();

        const subject =
            (note.subject || "").toLowerCase();

        const description =
            (note.description || "").toLowerCase();

        const matchesSearch =
            title.includes(searchValue) ||
            subject.includes(searchValue) ||
            description.includes(searchValue);

        const matchesSemester =
            !semesterValue ||
            String(note.semester) === semesterValue;

        const matchesBranch =
            !branchValue ||
            note.branch === branchValue;

        const matchesCategory =
            !categoryValue ||
            note.category === categoryValue;

        return (
            matchesSearch &&
            matchesSemester &&
            matchesBranch &&
            matchesCategory
        );
    });

    renderNotes(filteredNotes, "notesContainer");
}


// =========================================
// DOWNLOAD NOTE
// =========================================

function downloadNote(noteId) {
    const note = getNotes().find(
        item => item.id === noteId
    );

    if (!note) {
        showMessage("Note not found.");
        return;
    }

    if (!note.fileData) {
        showMessage("File data is unavailable.");
        return;
    }

    const link = document.createElement("a");

    link.href = note.fileData;
    link.download = note.fileName || "notes";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


// =========================================
// MY UPLOADS
// =========================================

function loadMyUploads() {
    const user = requireLogin();

    if (!user) return;

    const myNotes = getNotes().filter(
        note =>
            note.uploaderId === user.id ||
            note.uploaderEmail === user.email
    );

    renderNotes(myNotes, "myUploadsContainer");
}


// =========================================
// DELETE UPLOADED NOTE
// =========================================

function deleteNote(noteId) {
    const user = requireLogin();

    if (!user) return;

    const notes = getNotes();

    const note = notes.find(
        item => item.id === noteId
    );

    if (!note) {
        showMessage("Note not found.");
        return;
    }

    const isOwner =
        note.uploaderId === user.id ||
        note.uploaderEmail === user.email;

    if (!isOwner) {
        showMessage("You can only delete your own notes.");
        return;
    }

    const updatedNotes = notes.filter(
        item => item.id !== noteId
    );

    saveNotes(updatedNotes);
    loadMyUploads();
}


// =========================================
// MAKE FUNCTIONS AVAILABLE TO HTML
// =========================================

window.uploadNote = uploadNote;
window.loadDashboard = loadDashboard;
window.loadNotes = loadNotes;
window.filterNotes = filterNotes;
window.loadMyUploads = loadMyUploads;
window.downloadNote = downloadNote;
window.deleteNote = deleteNote;


// =========================================
// PAGE INITIALIZATION + FIREBASE AUTH
// =========================================

onAuthStateChanged(auth, user => {
    currentFirebaseUser = user;

    const page = window.location.pathname
        .split("/")
        .pop();

    const protectedPages = [
        "dashboard.html",
        "upload.html",
        "notes.html",
        "my-uploads.html",
        "profile.html"
    ];

    if (protectedPages.includes(page) && !user) {
        window.location.href = "login.html";
        return;
    }

    if (!user) return;

    updateNavigation();

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
    }
});