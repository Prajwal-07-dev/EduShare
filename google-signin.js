
import { auth, db } from "./firebase.js";

import {
    GoogleAuthProvider,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const googleButton = document.getElementById("googleSignInBtn");

if (googleButton) {
    googleButton.addEventListener("click", async () => {
        const provider = new GoogleAuthProvider();

        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Create or update the student's profile
            console.log("Google sign-in successful!");
            window.location.href = "dashboard.html";

        } catch (error) {
            console.error("Google sign-in error:", error);
            alert(error.code + ": " + error.message);
        }
    });
}